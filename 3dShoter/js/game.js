import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

class Game {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer();
        this.controls = null;
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.prevTime = performance.now();

        // Add new properties for shooting mechanics
        this.bullets = [];
        this.isShooting = false;
        this.lastShot = 0;
        this.shootingCooldown = 250; // milliseconds between shots
        this.bulletSpeed = 100;
        this.gun = null;

        // Add zombie properties
        this.zombies = [];
        this.zombieSpawnInterval = 3000; // Spawn a zombie every 3 seconds
        this.lastZombieSpawn = 0;
        this.playerHealth = 100;
        this.isGameOver = false;

        // Add wave properties
        this.currentWave = 1;
        this.zombiesPerWave = 5;
        this.zombiesRemainingToSpawn = 5;
        this.activeZombies = 0;
        this.waveDelay = 5000; // 5 seconds between waves
        this.lastWaveTime = 0;
        this.isWaveInProgress = false;
        this.isBossWave = false;

        // Add score properties
        this.score = 0;
        this.highScore = localStorage.getItem('highScore') || 0;
        this.pointsPerKill = 100;
        this.waveBonus = 500;

        // Add particle system for blood effects
        this.bloodParticles = [];
        this.bloodDecals = [];
        
        // Move audio initialization to after user interaction
        this.audioListener = null;
        this.zombieSounds = [];
        this.hitSounds = [];
        this.currentHitSound = 0;

        // Add weapon properties
        this.weapons = {
            pistol: {
                name: 'Pistol',
                damage: 34,
                cooldown: 250,
                bulletSpeed: 100,
                bulletSize: 0.05,
                bulletColor: 0xffff00,
                model: null,
                ammo: Infinity
            },
            shotgun: {
                name: 'Shotgun',
                damage: 20,
                cooldown: 800,
                bulletSpeed: 80,
                bulletSize: 0.03,
                bulletColor: 0xff4400,
                pellets: 8,
                spread: 0.2,
                model: null,
                ammo: 30
            },
            machineGun: {
                name: 'Machine Gun',
                damage: 15,
                cooldown: 100,
                bulletSpeed: 120,
                bulletSize: 0.04,
                bulletColor: 0x00ffff,
                model: null,
                ammo: 100
            }
        };
        
        this.currentWeapon = 'pistol';
        this.weaponDisplay = null;

        this.init();
    }

    init() {
        // Setup renderer
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        // Setup camera
        this.camera.position.y = 2;
        
        // Setup controls
        this.controls = new PointerLockControls(this.camera, document.body);

        // Setup click to start with better styling
        const blocker = document.createElement('div');
        blocker.style.position = 'absolute';
        blocker.style.top = '0';
        blocker.style.left = '0';
        blocker.style.width = '100%';
        blocker.style.height = '100%';
        blocker.style.backgroundColor = 'rgba(0,0,0,0.5)';
        blocker.style.display = 'flex';
        blocker.style.flexDirection = 'column';
        blocker.style.justifyContent = 'center';
        blocker.style.alignItems = 'center';
        blocker.style.color = 'white';
        blocker.style.fontSize = '24px';
        blocker.style.cursor = 'pointer';
        blocker.innerHTML = `
            <div style="text-align: center;">
                <h1>Zombie Survival Game</h1>
                <p>High Score: ${this.highScore}</p>
                <p>Click to Play</p>
                <p style="font-size: 18px;">
                    Controls:<br>
                    WASD or Arrow Keys = Move<br>
                    Mouse = Look around<br>
                    SPACE or LEFT CLICK = Shoot<br>
                    ESC = Pause
                </p>
            </div>
        `;
        document.body.appendChild(blocker);

        blocker.addEventListener('click', () => {
            this.controls.lock();
        });

        this.controls.addEventListener('lock', () => {
            blocker.style.display = 'none';
            this.initAudio(); // Initialize audio after user interaction
        });

        this.controls.addEventListener('unlock', () => {
            blocker.style.display = 'flex';
        });

        // Create larger ground with neon grid
        const groundSize = 200; // Increased from 100
        const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize, 40, 40);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x000000,
            roughness: 0.4,
            metalness: 0.5
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        this.scene.add(ground);
        
        // Add neon grid to ground
        const gridHelper = new THREE.GridHelper(groundSize, 40, 0x00ffff, 0xff00ff);
        gridHelper.position.y = 0.01;
        this.scene.add(gridHelper);
        
        // Enhanced lighting for neon atmosphere
        const ambientLight = new THREE.AmbientLight(0x000066, 0.2); // Dim blue ambient
        this.scene.add(ambientLight);
        
        const moonLight = new THREE.DirectionalLight(0x6666ff, 0.5);
        moonLight.position.set(0, 50, 0);
        this.scene.add(moonLight);
        
        // Add fog for cyberpunk atmosphere
        this.scene.fog = new THREE.Fog(0x000066, 1, 100);
        
        // Add buildings
        for (let i = 0; i < 30; i++) { // Increased number of buildings
            const building = this.createNeonBuilding();
            // Spread buildings over larger area
            building.position.x = Math.random() * 160 - 80; // Range: -80 to 80
            building.position.z = Math.random() * 160 - 80;
            // Rotate buildings randomly
            building.rotation.y = Math.random() * Math.PI * 2;
            this.scene.add(building);
        }

        // Add some basic lighting
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(0, 10, 0);
        this.scene.add(directionalLight);

        // Add some reference cubes to help visualize movement
        for (let i = 0; i < 10; i++) {
            const geometry = new THREE.BoxGeometry(2, 2, 2);
            const material = new THREE.MeshStandardMaterial({ 
                color: Math.random() * 0xffffff 
            });
            const cube = new THREE.Mesh(geometry, material);
            cube.position.x = Math.random() * 40 - 20;
            cube.position.z = Math.random() * 40 - 20;
            cube.position.y = 1;
            this.scene.add(cube);
        }

        // Setup event listeners
        document.addEventListener('keydown', (event) => this.onKeyDown(event));
        document.addEventListener('keyup', (event) => this.onKeyUp(event));
        window.addEventListener('resize', () => this.onWindowResize());

        // Add weapon models
        this.createWeaponModels();
        this.createWeaponDisplay();
        this.createCrosshair();

        // Add shooting event listeners
        document.addEventListener('keydown', (event) => {
            if (event.code === 'Space') {
                this.isShooting = true;
            }
        });

        document.addEventListener('keyup', (event) => {
            if (event.code === 'Space') {
                this.isShooting = false;
            }
        });

        // Add mouse click shooting
        document.addEventListener('mousedown', (event) => {
            if (event.button === 0) { // Left click
                this.isShooting = true;
            }
        });

        document.addEventListener('mouseup', (event) => {
            if (event.button === 0) { // Left click
                this.isShooting = false;
            }
        });

        // Add weapon switching keys
        document.addEventListener('keydown', (event) => {
            switch(event.code) {
                case 'Digit1':
                    this.switchWeapon('pistol');
                    break;
                case 'Digit2':
                    if (this.weapons.shotgun.ammo > 0) {
                        this.switchWeapon('shotgun');
                    }
                    break;
                case 'Digit3':
                    if (this.weapons.machineGun.ammo > 0) {
                        this.switchWeapon('machineGun');
                    }
                    break;
            }
        });

        this.createHealthDisplay();
        this.createWaveDisplay();
        this.createScoreDisplay();

        // Start animation loop
        this.animate();
    }

    initAudio() {
        if (!this.audioListener) {
            this.audioListener = new THREE.AudioListener();
            this.camera.add(this.audioListener);
            this.loadSoundEffects();
        }
    }

    onKeyDown(event) {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                this.moveForward = true;
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.moveBackward = true;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                this.moveLeft = true;
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.moveRight = true;
                break;
        }
    }

    onKeyUp(event) {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                this.moveForward = false;
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.moveBackward = false;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                this.moveLeft = false;
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.moveRight = false;
                break;
        }
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    updateMovement() {
        const time = performance.now();
        const delta = (time - this.prevTime) / 1000;

        this.velocity.x -= this.velocity.x * 10.0 * delta;
        this.velocity.z -= this.velocity.z * 10.0 * delta;

        this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
        this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
        this.direction.normalize();

        // Reduced speed for better control
        const speed = 50.0;
        if (this.moveForward || this.moveBackward) {
            this.velocity.z -= this.direction.z * speed * delta;
        }
        if (this.moveLeft || this.moveRight) {
            this.velocity.x -= this.direction.x * speed * delta;
        }

        this.controls.moveRight(-this.velocity.x * delta);
        this.controls.moveForward(-this.velocity.z * delta);

        this.prevTime = time;
    }

    shoot() {
        const weapon = this.weapons[this.currentWeapon];
        const now = performance.now();
        if (now - this.lastShot < weapon.cooldown || 
            (weapon.ammo !== Infinity && weapon.ammo <= 0)) return;
        
        this.lastShot = now;
        
        if (weapon.ammo !== Infinity) {
            weapon.ammo--;
            this.updateWeaponDisplay();
        }
        
        if (this.currentWeapon === 'shotgun') {
            // Shotgun spread
            for (let i = 0; i < weapon.pellets; i++) {
                this.createBullet(weapon, true);
            }
        } else {
            this.createBullet(weapon, false);
        }
        
        // Gun recoil animation
        weapon.model.position.z += 0.1;
        setTimeout(() => {
            weapon.model.position.z -= 0.1;
        }, 50);
    }

    createBullet(weapon, spread = false) {
        const bulletGeometry = new THREE.SphereGeometry(weapon.bulletSize);
        const bulletMaterial = new THREE.MeshBasicMaterial({ color: weapon.bulletColor });
        const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
        
        bullet.position.copy(this.camera.position);
        
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        
        if (spread) {
            direction.x += (Math.random() - 0.5) * weapon.spread;
            direction.y += (Math.random() - 0.5) * weapon.spread;
            direction.z += (Math.random() - 0.5) * weapon.spread;
            direction.normalize();
        }
        
        this.bullets.push({
            mesh: bullet,
            velocity: direction.multiplyScalar(weapon.bulletSpeed),
            created: performance.now(),
            damage: weapon.damage
        });
        
        this.scene.add(bullet);
    }

    updateBullets(delta) {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            
            // Update position
            bullet.mesh.position.add(bullet.velocity.clone().multiplyScalar(delta));
            
            // Check for collisions with cubes
            this.scene.children.forEach(child => {
                if (child.isMesh && child !== bullet.mesh && child.geometry.type === 'BoxGeometry') {
                    const bulletBox = new THREE.Box3().setFromObject(bullet.mesh);
                    const targetBox = new THREE.Box3().setFromObject(child);
                    
                    if (bulletBox.intersectsBox(targetBox)) {
                        // Remove bullet
                        this.scene.remove(bullet.mesh);
                        this.bullets.splice(i, 1);
                        
                        // Make the cube react
                        child.material.color.setHex(Math.random() * 0xffffff);
                        child.position.y += 0.5;
                        setTimeout(() => {
                            child.position.y -= 0.5;
                        }, 200);
                    }
                }
            });
            
            // Remove old bullets
            if (performance.now() - bullet.created > 2000) {
                this.scene.remove(bullet.mesh);
                this.bullets.splice(i, 1);
            }
        }
    }

    loadSoundEffects() {
        try {
            const audioLoader = new THREE.AudioLoader();
            
            // Load zombie groans with error handling
            this.zombieSoundBuffers = []; // Store the audio buffers
            Promise.all(['groan1.wav', 'groan2.wav', 'groan3.wav'].map(name => {
                return new Promise((resolve, reject) => {
                    audioLoader.load(`sounds/${name}`, 
                        buffer => {
                            this.zombieSoundBuffers.push(buffer);
                            resolve();
                        },
                        undefined,
                        error => {
                            console.warn('Could not load sound:', name, error);
                            reject(error);
                        }
                    );
                });
            })).catch(error => {
                console.warn('Failed to load some zombie sounds:', error);
            });
            
            // Create multiple hit sounds for overlapping hits
            this.hitSounds = Array(3).fill(null).map(() => {
                const sound = new THREE.Audio(this.audioListener);
                return sound;
            });
            
            // Load hit sound
            audioLoader.load('sounds/hit.wav',
                buffer => {
                    this.hitSounds.forEach(sound => {
                        sound.setBuffer(buffer);
                        sound.setVolume(0.5);
                    });
                },
                undefined,
                error => {
                    console.warn('Could not load hit sound:', error);
                }
            );
        } catch (error) {
            console.warn('Audio system initialization failed:', error);
            this.zombieSoundBuffers = [];
            this.hitSounds = [];
        }
    }

    createBloodParticles(position) {
        const particleCount = 30;
        const particles = new THREE.Group();
        
        for (let i = 0; i < particleCount; i++) {
            const particle = new THREE.Mesh(
                new THREE.SphereGeometry(0.05),
                new THREE.MeshBasicMaterial({ color: 0x8b0000 })
            );
            
            particle.position.copy(position);
            particle.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 5,
                Math.random() * 5,
                (Math.random() - 0.5) * 5
            );
            particle.lifetime = 1 + Math.random();
            particle.age = 0;
            
            particles.add(particle);
        }
        
        this.scene.add(particles);
        this.bloodParticles.push({
            group: particles,
            particles: particles.children
        });
    }

    createBloodDecal(position) {
        const decalGeometry = new THREE.CircleGeometry(0.5 + Math.random() * 0.5);
        const decalMaterial = new THREE.MeshBasicMaterial({
            color: 0x8b0000,
            transparent: true,
            opacity: 0.8,
            depthWrite: false
        });
        
        const decal = new THREE.Mesh(decalGeometry, decalMaterial);
        decal.rotation.x = -Math.PI / 2;
        decal.position.copy(position);
        decal.position.y = 0.01; // Slightly above ground
        
        this.scene.add(decal);
        this.bloodDecals.push({
            mesh: decal,
            age: 0,
            lifetime: 30 // Seconds before fading
        });
    }

    createEnhancedZombie() {
        const zombieGroup = new THREE.Group();
        
        // Enhanced materials with better colors and properties
        const skinMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x2d5e1e,  // Darker green
            roughness: 0.9,
            metalness: 0.1,
            emissive: 0x0a1a06,  // Slight glow
            emissiveIntensity: 0.2
        });
        
        const clothingMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x1a1a1a,  // Almost black
            roughness: 1,
            metalness: 0
        });
        
        // Body - torso
        const torsoGeometry = new THREE.BoxGeometry(0.8, 1.2, 0.4);
        const torso = new THREE.Mesh(torsoGeometry, clothingMaterial);
        torso.position.y = 0.6;
        zombieGroup.add(torso);
        
        // Head with more detail
        const headGroup = new THREE.Group();
        headGroup.position.y = 1.5;
        
        // Main head
        const headGeometry = new THREE.BoxGeometry(0.4, 0.5, 0.4);
        const head = new THREE.Mesh(headGeometry, skinMaterial);
        headGroup.add(head);
        
        // Jaw
        const jawGeometry = new THREE.BoxGeometry(0.35, 0.1, 0.3);
        const jaw = new THREE.Mesh(jawGeometry, skinMaterial);
        jaw.position.y = -0.25;
        jaw.position.z = 0.05;
        headGroup.add(jaw);
        
        // Eyes (red)
        const eyeGeometry = new THREE.SphereGeometry(0.05);
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.1, 0, 0.2);
        headGroup.add(leftEye);
        
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.1, 0, 0.2);
        headGroup.add(rightEye);
        
        // Random head tilt for variety
        headGroup.rotation.z = (Math.random() - 0.5) * 0.5;
        headGroup.rotation.x = (Math.random() - 0.5) * 0.3;
        zombieGroup.add(headGroup);
        
        // Arms with joints
        const createArm = (isLeft) => {
            const armGroup = new THREE.Group();
            
            // Upper arm
            const upperArmGeometry = new THREE.BoxGeometry(0.2, 0.6, 0.2);
            const upperArm = new THREE.Mesh(upperArmGeometry, skinMaterial);
            upperArm.position.y = -0.3;
            armGroup.add(upperArm);
            
            // Lower arm
            const lowerArmGeometry = new THREE.BoxGeometry(0.15, 0.6, 0.15);
            const lowerArm = new THREE.Mesh(lowerArmGeometry, skinMaterial);
            lowerArm.position.y = -0.8;
            // Random arm rotation for variety
            lowerArm.rotation.x = Math.random() * Math.PI * 0.25;
            armGroup.add(lowerArm);
            
            // Position the whole arm
            armGroup.position.set(isLeft ? -0.5 : 0.5, 1.2, 0);
            // Random shoulder rotation
            armGroup.rotation.z = (isLeft ? 1 : -1) * (Math.PI * 0.15 + Math.random() * Math.PI * 0.1);
            return armGroup;
        };
        
        zombieGroup.add(createArm(true));  // Left arm
        zombieGroup.add(createArm(false)); // Right arm
        
        // Legs with joints
        const createLeg = (isLeft) => {
            const legGroup = new THREE.Group();
            
            // Upper leg
            const upperLegGeometry = new THREE.BoxGeometry(0.25, 0.7, 0.25);
            const upperLeg = new THREE.Mesh(upperLegGeometry, clothingMaterial);
            upperLeg.position.y = -0.35;
            legGroup.add(upperLeg);
            
            // Lower leg
            const lowerLegGeometry = new THREE.BoxGeometry(0.2, 0.7, 0.2);
            const lowerLeg = new THREE.Mesh(lowerLegGeometry, skinMaterial);
            lowerLeg.position.y = -1;
            // Random leg bend
            lowerLeg.rotation.x = Math.random() * Math.PI * 0.1;
            legGroup.add(lowerLeg);
            
            // Position the whole leg
            legGroup.position.set(isLeft ? -0.3 : 0.3, 0.3, 0);
            return legGroup;
        };
        
        zombieGroup.add(createLeg(true));  // Left leg
        zombieGroup.add(createLeg(false)); // Right leg
        
        // Random spawn position around the player
        const angle = Math.random() * Math.PI * 2;
        const distance = 30;
        zombieGroup.position.x = Math.cos(angle) * distance;
        zombieGroup.position.z = Math.sin(angle) * distance;
        zombieGroup.position.y = 0; // Start at ground level
        
        // Add random overall tilt
        zombieGroup.rotation.y = Math.random() * Math.PI * 2;
        zombieGroup.rotation.x = (Math.random() - 0.5) * 0.2;
        
        this.scene.add(zombieGroup);
        
        // Add simple walking animation
        const walkingAnimation = {
            time: Math.random() * Math.PI * 2, // Random start time for variety
            speed: 5 + Math.random() * 2
        };
        
        // Add health bar
        const healthBarGroup = new THREE.Group();
        healthBarGroup.position.y = 2.2; // Position above head

        // Background bar (grey)
        const barGeometry = new THREE.PlaneGeometry(1, 0.1);
        const backgroundBar = new THREE.Mesh(
            barGeometry,
            new THREE.MeshBasicMaterial({ color: 0x444444 })
        );
        healthBarGroup.add(backgroundBar);

        // Health bar (red)
        const healthBar = new THREE.Mesh(
            barGeometry,
            new THREE.MeshBasicMaterial({ color: 0xff0000 })
        );
        healthBar.position.z = 0.01; // Slightly in front of background
        healthBarGroup.add(healthBar);

        zombieGroup.add(healthBarGroup);

        // Store reference to health bar for updating
        zombieGroup.healthBar = healthBar;

        // Make health bar always face camera
        healthBarGroup.rotation.x = -Math.PI / 6;

        // Add zombie sounds with better handling
        let zombieSound = null;
        if (this.audioListener && this.zombieSoundBuffers.length > 0) {
            zombieSound = new THREE.PositionalAudio(this.audioListener);
            const randomBuffer = this.zombieSoundBuffers[Math.floor(Math.random() * this.zombieSoundBuffers.length)];
            zombieSound.setBuffer(randomBuffer);
            zombieSound.setRefDistance(20);
            zombieSound.setVolume(0.5);
            zombieSound.setLoop(false);
            zombieGroup.add(zombieSound);
            
            // Schedule random groaning with better checks
            const groanInterval = setInterval(() => {
                if (zombieSound && zombieSound.buffer && !zombieSound.isPlaying && Math.random() < 0.1) {
                    zombieSound.play();
                }
            }, 5000);

            // Store interval for cleanup
            zombieGroup.groanInterval = groanInterval;
        }

        return {
            mesh: zombieGroup,
            health: 100,
            maxHealth: 100,
            speed: 3 + Math.random() * 2,
            damage: 10,
            lastAttack: 0,
            attackCooldown: 1000,
            animation: walkingAnimation,
            sound: zombieSound,
            cleanup: () => {
                if (zombieGroup.groanInterval) {
                    clearInterval(zombieGroup.groanInterval);
                }
                if (zombieSound) {
                    zombieSound.stop();
                }
            }
        };
    }

    updateZombies(delta) {
        const now = performance.now();

        // Wave management
        if (!this.isWaveInProgress && now - this.lastWaveTime > this.waveDelay) {
            this.startNewWave();
        }

        // Spawn zombies during wave
        if (this.isWaveInProgress && this.zombiesRemainingToSpawn > 0 && 
            now - this.lastZombieSpawn > this.zombieSpawnInterval) {
            if (this.isBossWave) {
                this.zombies.push(this.createBossZombie());
            } else {
                this.zombies.push(this.createEnhancedZombie());
            }
            this.zombiesRemainingToSpawn--;
            this.activeZombies++;
            this.lastZombieSpawn = now;
        }

        // Update existing zombies
        for (let i = this.zombies.length - 1; i >= 0; i--) {
            const zombie = this.zombies[i];
            
            // Update zombie position
            const direction = new THREE.Vector3();
            direction.subVectors(this.camera.position, zombie.mesh.position);
            direction.y = 0; // Keep zombies on ground
            direction.normalize();
            
            // Move zombie
            zombie.mesh.position.add(direction.multiplyScalar(zombie.speed * delta));
            zombie.mesh.lookAt(this.camera.position);

            // Update walking animation
            if (zombie.animation) {
                zombie.animation.time += delta;
                const legRotation = Math.sin(zombie.animation.time * zombie.animation.speed * Math.PI) * zombie.animation.maxRotation;
                
                if (zombie.mesh.leftLeg && zombie.mesh.rightLeg) {
                    zombie.mesh.leftLeg.rotation.x = legRotation;
                    zombie.mesh.rightLeg.rotation.x = -legRotation;
                }
            }
            
            // Update health bar scale based on health percentage
            const healthPercent = zombie.health / zombie.maxHealth;
            zombie.mesh.healthBar.scale.x = healthPercent;
            
            // Make health bar face camera
            const healthBarGroup = zombie.mesh.healthBar.parent;
            healthBarGroup.rotation.y = Math.atan2(
                (this.camera.position.x - zombie.mesh.position.x),
                (this.camera.position.z - zombie.mesh.position.z)
            );
            
            // Check for bullet collisions
            for (let j = this.bullets.length - 1; j >= 0; j--) {
                const bullet = this.bullets[j];
                const bulletBox = new THREE.Box3().setFromObject(bullet.mesh);
                const zombieBox = new THREE.Box3().setFromObject(zombie.mesh);
                
                if (bulletBox.intersectsBox(zombieBox)) {
                    // Remove bullet
                    this.scene.remove(bullet.mesh);
                    this.bullets.splice(j, 1);
                    
                    // Create blood effects
                    this.createBloodParticles(bullet.mesh.position);
                    this.createBloodDecal(new THREE.Vector3(
                        zombie.mesh.position.x,
                        0,
                        zombie.mesh.position.z
                    ));
                    
                    // Play hit sound if available using sound pool
                    if (this.hitSounds && this.hitSounds.length > 0) {
                        const hitSound = this.hitSounds[this.currentHitSound];
                        if (hitSound && hitSound.buffer && !hitSound.isPlaying) {
                            hitSound.play();
                        }
                        this.currentHitSound = (this.currentHitSound + 1) % this.hitSounds.length;
                    }
                    
                    // Damage zombie
                    zombie.health -= 34;
                    
                    // Remove zombie if dead
                    if (zombie.health <= 0) {
                        if (zombie.cleanup) {
                            zombie.cleanup(); // Clean up sounds
                        }
                        this.scene.remove(zombie.mesh);
                        this.zombies.splice(i, 1);
                        this.activeZombies--;
                        
                        // Add score for kill
                        this.addScore(this.pointsPerKill);
                        
                        // Check if wave is complete
                        if (this.activeZombies === 0 && this.zombiesRemainingToSpawn === 0) {
                            this.isWaveInProgress = false;
                            this.lastWaveTime = now;
                        }
                        break;
                    }
                }
            }
            
            // Check for player collision
            const zombieBox = new THREE.Box3().setFromObject(zombie.mesh);
            const playerPosition = this.camera.position.clone();
            const playerBox = new THREE.Box3(
                new THREE.Vector3(playerPosition.x - 0.5, playerPosition.y - 1, playerPosition.z - 0.5),
                new THREE.Vector3(playerPosition.x + 0.5, playerPosition.y + 1, playerPosition.z + 0.5)
            );
            
            if (zombieBox.intersectsBox(playerBox)) {
                if (now - zombie.lastAttack > zombie.attackCooldown) {
                    this.playerHealth -= zombie.damage;
                    zombie.lastAttack = now;
                    
                    if (this.playerHealth <= 0 && !this.isGameOver) {
                        this.gameOver();
                    }
                }
            }
        }

        this.updateWaveDisplay();
    }

    gameOver() {
        this.isGameOver = true;
        this.controls.unlock();
        
        const gameOverScreen = document.createElement('div');
        gameOverScreen.style.position = 'absolute';
        gameOverScreen.style.top = '50%';
        gameOverScreen.style.left = '50%';
        gameOverScreen.style.transform = 'translate(-50%, -50%)';
        gameOverScreen.style.color = 'red';
        gameOverScreen.style.fontSize = '48px';
        gameOverScreen.style.fontWeight = 'bold';
        gameOverScreen.style.textAlign = 'center';
        gameOverScreen.innerHTML = `GAME OVER<br>
            <div style="font-size: 24px; margin-top: 20px;">
                Final Score: ${this.score}<br>
                High Score: ${this.highScore}
            </div>`;
        document.body.appendChild(gameOverScreen);
        
        // Add restart button
        const restartButton = document.createElement('button');
        restartButton.style.marginTop = '20px';
        restartButton.style.padding = '10px 20px';
        restartButton.style.fontSize = '20px';
        restartButton.textContent = 'Play Again';
        restartButton.onclick = () => location.reload();
        gameOverScreen.appendChild(restartButton);
    }

    createHealthDisplay() {
        const healthDisplay = document.createElement('div');
        healthDisplay.style.position = 'absolute';
        healthDisplay.style.top = '20px';
        healthDisplay.style.left = '20px';
        healthDisplay.style.color = 'white';
        healthDisplay.style.fontSize = '24px';
        document.body.appendChild(healthDisplay);
        this.healthDisplay = healthDisplay;
    }

    updateHealthDisplay() {
        this.healthDisplay.textContent = `Health: ${this.playerHealth}`;
    }

    createWaveDisplay() {
        const waveDisplay = document.createElement('div');
        waveDisplay.style.position = 'absolute';
        waveDisplay.style.top = '20px';
        waveDisplay.style.right = '20px';
        waveDisplay.style.color = 'white';
        waveDisplay.style.fontSize = '24px';
        document.body.appendChild(waveDisplay);
        this.waveDisplay = waveDisplay;
    }

    updateWaveDisplay() {
        this.waveDisplay.textContent = `Wave: ${this.currentWave}\nZombies: ${this.activeZombies}`;
    }

    createScoreDisplay() {
        const scoreDisplay = document.createElement('div');
        scoreDisplay.style.position = 'absolute';
        scoreDisplay.style.top = '60px';
        scoreDisplay.style.right = '20px';
        scoreDisplay.style.color = 'white';
        scoreDisplay.style.fontSize = '24px';
        document.body.appendChild(scoreDisplay);
        this.scoreDisplay = scoreDisplay;
        this.updateScoreDisplay();
    }

    updateScoreDisplay() {
        this.scoreDisplay.textContent = `Score: ${this.score}\nHigh Score: ${this.highScore}`;
    }

    addScore(points) {
        this.score += points;
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('highScore', this.highScore);
        }
        this.updateScoreDisplay();

        // Show floating score text
        const scoreText = document.createElement('div');
        scoreText.style.position = 'absolute';
        scoreText.style.left = '50%';
        scoreText.style.top = '40%';
        scoreText.style.transform = 'translate(-50%, -50%)';
        scoreText.style.color = 'yellow';
        scoreText.style.fontSize = '24px';
        scoreText.style.pointerEvents = 'none';
        scoreText.textContent = `+${points}`;
        document.body.appendChild(scoreText);

        // Animate and remove the score text
        let opacity = 1;
        const fadeOut = setInterval(() => {
            opacity -= 0.05;
            scoreText.style.opacity = opacity;
            scoreText.style.top = `${parseFloat(scoreText.style.top) - 0.5}%`;
            if (opacity <= 0) {
                clearInterval(fadeOut);
                document.body.removeChild(scoreText);
            }
        }, 50);
    }

    startNewWave() {
        this.currentWave++;
        
        // Check if it's a boss wave (every 5th wave)
        if (this.currentWave % 5 === 0) {
            this.zombiesPerWave = 1; // Only spawn boss
            this.zombiesRemainingToSpawn = 1;
            this.isWaveInProgress = true;
            this.isBossWave = true;
            
            // Show boss wave announcement
            const waveAnnouncement = document.createElement('div');
            waveAnnouncement.style.position = 'absolute';
            waveAnnouncement.style.top = '50%';
            waveAnnouncement.style.left = '50%';
            waveAnnouncement.style.transform = 'translate(-50%, -50%)';
            waveAnnouncement.style.color = 'red';
            waveAnnouncement.style.fontSize = '64px';
            waveAnnouncement.style.fontWeight = 'bold';
            waveAnnouncement.style.textAlign = 'center';
            waveAnnouncement.style.textShadow = '0 0 10px #ff0000';
            waveAnnouncement.innerHTML = `BOSS WAVE ${this.currentWave}`;
            document.body.appendChild(waveAnnouncement);
            
            setTimeout(() => {
                document.body.removeChild(waveAnnouncement);
            }, 3000);
        } else {
            // Normal wave logic
            this.isBossWave = false;
            this.zombiesPerWave = Math.floor(5 + (this.currentWave - 1) * 2);
            this.zombiesRemainingToSpawn = this.zombiesPerWave;
            this.isWaveInProgress = true;
            
            // Add wave bonus points
            if (this.currentWave > 1) {
                this.addScore(this.waveBonus * (this.currentWave - 1));
            }
            
            // Show wave announcement with bonus
            const waveAnnouncement = document.createElement('div');
            waveAnnouncement.style.position = 'absolute';
            waveAnnouncement.style.top = '50%';
            waveAnnouncement.style.left = '50%';
            waveAnnouncement.style.transform = 'translate(-50%, -50%)';
            waveAnnouncement.style.color = 'white';
            waveAnnouncement.style.fontSize = '48px';
            waveAnnouncement.style.fontWeight = 'bold';
            waveAnnouncement.style.textAlign = 'center';
            waveAnnouncement.innerHTML = `Wave ${this.currentWave}
                ${this.currentWave > 1 ? `<div style="font-size: 24px;">Wave Bonus: +${this.waveBonus * (this.currentWave - 1)}</div>` : ''}`;
            document.body.appendChild(waveAnnouncement);
            
            setTimeout(() => {
                document.body.removeChild(waveAnnouncement);
            }, 2000);
        }
    }

    createNeonBuilding() {
        const buildingGroup = new THREE.Group();
        
        // Random building dimensions
        const width = 4 + Math.random() * 8;
        const height = 10 + Math.random() * 30;
        const depth = 4 + Math.random() * 8;
        
        // Main building structure
        const buildingGeometry = new THREE.BoxGeometry(width, height, depth);
        const buildingMaterial = new THREE.MeshStandardMaterial({
            color: 0x202020,
            roughness: 0.3,
            metalness: 0.7
        });
        const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
        building.position.y = height / 2;
        buildingGroup.add(building);
        
        // Add windows
        const windowRows = Math.floor(height / 2);
        const windowCols = Math.floor(width / 2);
        const windowGeometry = new THREE.PlaneGeometry(0.8, 0.8);
        const windowMaterial = new THREE.MeshStandardMaterial({
            color: new THREE.Color(Math.random(), Math.random(), 1),
            emissive: new THREE.Color(Math.random(), Math.random(), 1),
            emissiveIntensity: 1,
            metalness: 0.5,
            roughness: 0.2
        });
        
        // Front and back windows
        for (let row = 0; row < windowRows; row++) {
            for (let col = 0; col < windowCols; col++) {
                if (Math.random() > 0.2) { // 80% chance of window
                    const window = new THREE.Mesh(windowGeometry, windowMaterial);
                    window.position.set(
                        (col * 2) - (width / 2) + 1,
                        row * 2 + 1,
                        depth / 2 + 0.1
                    );
                    buildingGroup.add(window);
                    
                    // Back windows
                    const backWindow = window.clone();
                    backWindow.position.z = -depth / 2 - 0.1;
                    backWindow.rotation.y = Math.PI;
                    buildingGroup.add(backWindow);
                }
            }
        }
        
        // Add neon trim
        const neonColor = new THREE.Color(Math.random(), Math.random(), 1);
        const neonMaterial = new THREE.MeshStandardMaterial({
            color: neonColor,
            emissive: neonColor,
            emissiveIntensity: 2,
            metalness: 0.5,
            roughness: 0.2
        });
        
        // Vertical neon strips
        const stripGeometry = new THREE.BoxGeometry(0.1, height, 0.1);
        for (let i = 0; i < 4; i++) {
            const strip = new THREE.Mesh(stripGeometry, neonMaterial);
            strip.position.y = height / 2;
            strip.position.x = (i < 2 ? -1 : 1) * (width / 2);
            strip.position.z = (i % 2 === 0 ? -1 : 1) * (depth / 2);
            buildingGroup.add(strip);
        }
        
        // Horizontal neon trim at top
        const topTrimGeometry = new THREE.BoxGeometry(width + 0.2, 0.1, depth + 0.2);
        const topTrim = new THREE.Mesh(topTrimGeometry, neonMaterial);
        topTrim.position.y = height;
        buildingGroup.add(topTrim);
        
        return buildingGroup;
    }

    updateBloodEffects(delta) {
        // Update blood particles
        for (let i = this.bloodParticles.length - 1; i >= 0; i--) {
            const particleSystem = this.bloodParticles[i];
            let allDead = true;
            
            particleSystem.particles.forEach(particle => {
                particle.age += delta;
                
                if (particle.age < particle.lifetime) {
                    allDead = false;
                    particle.velocity.y -= 9.8 * delta; // Gravity
                    particle.position.add(particle.velocity.clone().multiplyScalar(delta));
                    particle.material.opacity = 1 - (particle.age / particle.lifetime);
                }
            });
            
            if (allDead) {
                this.scene.remove(particleSystem.group);
                this.bloodParticles.splice(i, 1);
            }
        }
        
        // Update blood decals
        for (let i = this.bloodDecals.length - 1; i >= 0; i--) {
            const decal = this.bloodDecals[i];
            decal.age += delta;
            
            if (decal.age > decal.lifetime) {
                this.scene.remove(decal.mesh);
                this.bloodDecals.splice(i, 1);
            } else if (decal.age > decal.lifetime * 0.7) {
                decal.mesh.material.opacity = 1 - ((decal.age - decal.lifetime * 0.7) / (decal.lifetime * 0.3));
            }
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        const delta = (performance.now() - this.prevTime) / 1000;
        
        if (this.controls.isLocked && !this.isGameOver) {
            this.updateMovement();
            
            if (this.isShooting) {
                this.shoot();
            }
            
            this.updateBullets(delta);
            this.updateZombies(delta);
            this.updateBloodEffects(delta);
            this.updateHealthDisplay();
        }
        
        this.renderer.render(this.scene, this.camera);
        this.prevTime = performance.now();
    }

    createWeaponModels() {
        // Pistol model
        this.weapons.pistol.model = this.createPistolModel();
        
        // Shotgun model
        this.weapons.shotgun.model = this.createShotgunModel();
        
        // Machine Gun model
        this.weapons.machineGun.model = this.createMachineGunModel();
        
        // Hide all weapons initially
        Object.values(this.weapons).forEach(weapon => {
            if (weapon.model) {
                weapon.model.visible = false;
                this.camera.add(weapon.model);
            }
        });
        
        // Show initial weapon
        this.weapons[this.currentWeapon].model.visible = true;
    }

    createPistolModel() {
        const gunGroup = new THREE.Group();
        
        // Gun barrel
        const barrelGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.5);
        const barrelMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 });
        const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
        barrel.position.z = -0.25;
        
        // Gun handle
        const handleGeometry = new THREE.BoxGeometry(0.1, 0.3, 0.1);
        const handle = new THREE.Mesh(handleGeometry, barrelMaterial);
        handle.position.y = -0.2;
        
        gunGroup.add(barrel);
        gunGroup.add(handle);
        gunGroup.position.set(0.3, -0.3, -0.5);
        
        return gunGroup;
    }

    createShotgunModel() {
        const gunGroup = new THREE.Group();
        
        // Wider barrel
        const barrelGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.8);
        const barrelMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 });
        const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
        barrel.position.z = -0.4;
        
        // Pump action
        const pumpGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.3);
        const pump = new THREE.Mesh(pumpGeometry, barrelMaterial);
        pump.position.z = -0.2;
        
        // Stock
        const stockGeometry = new THREE.BoxGeometry(0.1, 0.2, 0.4);
        const stock = new THREE.Mesh(stockGeometry, barrelMaterial);
        stock.position.z = 0.2;
        stock.position.y = -0.1;
        
        gunGroup.add(barrel);
        gunGroup.add(pump);
        gunGroup.add(stock);
        gunGroup.position.set(0.3, -0.3, -0.5);
        
        return gunGroup;
    }

    createMachineGunModel() {
        const gunGroup = new THREE.Group();
        
        // Long barrel
        const barrelGeometry = new THREE.BoxGeometry(0.1, 0.1, 1);
        const barrelMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 });
        const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
        barrel.position.z = -0.5;
        
        // Magazine
        const magGeometry = new THREE.BoxGeometry(0.1, 0.4, 0.15);
        const magazine = new THREE.Mesh(magGeometry, barrelMaterial);
        magazine.position.y = -0.3;
        
        gunGroup.add(barrel);
        gunGroup.add(magazine);
        gunGroup.position.set(0.3, -0.3, -0.5);
        
        return gunGroup;
    }

    createWeaponDisplay() {
        const weaponDisplay = document.createElement('div');
        weaponDisplay.style.position = 'absolute';
        weaponDisplay.style.bottom = '20px';
        weaponDisplay.style.right = '20px';
        weaponDisplay.style.color = 'white';
        weaponDisplay.style.fontSize = '24px';
        document.body.appendChild(weaponDisplay);
        this.weaponDisplay = weaponDisplay;
        this.updateWeaponDisplay();
    }

    updateWeaponDisplay() {
        const weapon = this.weapons[this.currentWeapon];
        this.weaponDisplay.textContent = 
            `${weapon.name} ${weapon.ammo < Infinity ? `[Ammo: ${weapon.ammo}]` : ''}`;
    }

    switchWeapon(weaponName) {
        if (this.weapons[weaponName] && weaponName !== this.currentWeapon) {
            // Hide current weapon
            this.weapons[this.currentWeapon].model.visible = false;
            
            // Show new weapon
            this.currentWeapon = weaponName;
            this.weapons[this.currentWeapon].model.visible = true;
            
            this.updateWeaponDisplay();
        }
    }

    createCrosshair() {
        const crosshair = document.createElement('div');
        crosshair.style.position = 'absolute';
        crosshair.style.top = '50%';
        crosshair.style.left = '50%';
        crosshair.style.width = '20px';
        crosshair.style.height = '20px';
        crosshair.style.backgroundColor = 'transparent';
        crosshair.style.border = '2px solid white';
        crosshair.style.borderRadius = '50%';
        crosshair.style.transform = 'translate(-50%, -50%)';
        crosshair.style.pointerEvents = 'none';
        document.body.appendChild(crosshair);
        this.crosshair = crosshair;
    }

    createBossZombie() {
        const zombieGroup = new THREE.Group();
        
        // Main body - larger and more detailed
        const bodyGeometry = new THREE.BoxGeometry(3, 4, 2);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x330000,
            roughness: 0.7,
            metalness: 0.3,
            emissive: 0x110000,
            emissiveIntensity: 0.5
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 4; // Raised higher to be more visible
        zombieGroup.add(body);
        
        // Glowing eyes - made bigger
        const eyeGeometry = new THREE.SphereGeometry(0.3, 16, 16);
        const eyeMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 3
        });
        
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.5, 5.5, 0.8); // Adjusted position
        zombieGroup.add(leftEye);
        
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.5, 5.5, 0.8); // Adjusted position
        zombieGroup.add(rightEye);
        
        // Spikes on back - made bigger
        const spikeGeometry = new THREE.ConeGeometry(0.3, 1.5, 8);
        const spikeMaterial = new THREE.MeshStandardMaterial({
            color: 0x660000,
            roughness: 0.3,
            metalness: 0.7,
            emissive: 0x330000,
            emissiveIntensity: 0.3
        });
        
        for (let i = 0; i < 6; i++) {
            const spike = new THREE.Mesh(spikeGeometry, spikeMaterial);
            spike.position.set(0, 5.5, -0.8); // Adjusted position
            spike.rotation.x = Math.PI / 3;
            spike.position.x = (i - 2.5) * 0.6; // Spread spikes wider
            zombieGroup.add(spike);
        }
        
        // Claws - made bigger and more menacing
        const clawGeometry = new THREE.ConeGeometry(0.2, 1, 4);
        const clawMaterial = new THREE.MeshStandardMaterial({
            color: 0x111111,
            roughness: 0.2,
            metalness: 0.9,
            emissive: 0x110000,
            emissiveIntensity: 0.2
        });
        
        // Add claws to both hands
        for (let side of [-1, 1]) {
            for (let i = 0; i < 3; i++) {
                const claw = new THREE.Mesh(clawGeometry, clawMaterial);
                claw.position.set(side * 2, 3, 0.8 + i * 0.4);
                claw.rotation.x = -Math.PI / 3;
                zombieGroup.add(claw);
            }
        }
        
        // Add health bar - made bigger
        const healthBarGroup = new THREE.Group();
        healthBarGroup.position.y = 7; // Raised higher
        
        const barGeometry = new THREE.PlaneGeometry(4, 0.4);
        const backgroundBar = new THREE.Mesh(
            barGeometry,
            new THREE.MeshBasicMaterial({ color: 0x444444 })
        );
        healthBarGroup.add(backgroundBar);
        
        const healthBar = new THREE.Mesh(
            barGeometry,
            new THREE.MeshBasicMaterial({ color: 0xff0000 })
        );
        healthBar.position.z = 0.01;
        healthBarGroup.add(healthBar);
        
        zombieGroup.add(healthBarGroup);
        zombieGroup.healthBar = healthBar;
        healthBarGroup.rotation.x = -Math.PI / 6;

        // Add legs for animation - made bigger
        const legGeometry = new THREE.BoxGeometry(0.8, 4, 0.8);
        const legMaterial = new THREE.MeshStandardMaterial({
            color: 0x330000,
            roughness: 0.7,
            metalness: 0.3,
            emissive: 0x110000,
            emissiveIntensity: 0.3
        });

        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(-1, 2, 0);
        zombieGroup.add(leftLeg);

        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(1, 2, 0);
        zombieGroup.add(rightLeg);

        // Store legs in the group for animation
        zombieGroup.leftLeg = leftLeg;
        zombieGroup.rightLeg = rightLeg;

        // Scale the entire group
        zombieGroup.scale.set(2, 2, 2);

        return {
            mesh: zombieGroup,
            health: 1000,
            maxHealth: 1000,
            speed: 2,
            damage: 25,
            lastAttack: 0,
            attackCooldown: 2000,
            isBoss: true,
            animation: {
                time: 0,
                speed: 1.5,
                legRotation: 0,
                maxRotation: Math.PI / 6
            }
        };
    }
}

// Start the game
new Game();