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

        // Add score properties
        this.score = 0;
        this.highScore = localStorage.getItem('highScore') || 0;
        this.pointsPerKill = 100;
        this.waveBonus = 500;

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

        // Add gun and crosshair
        this.createGun();
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

        this.createHealthDisplay();
        this.createWaveDisplay();
        this.createScoreDisplay();

        // Start animation loop
        this.animate();
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

    createGun() {
        // Simple gun model
        const gunGroup = new THREE.Group();
        
        // Gun barrel
        const barrelGeometry = new THREE.BoxGeometry(0.1, 0.1, 1);
        const barrelMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 });
        const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
        barrel.position.z = -0.5;
        
        // Gun handle
        const handleGeometry = new THREE.BoxGeometry(0.1, 0.3, 0.1);
        const handle = new THREE.Mesh(handleGeometry, barrelMaterial);
        handle.position.y = -0.2;
        
        gunGroup.add(barrel);
        gunGroup.add(handle);
        
        // Position the gun in view
        gunGroup.position.set(0.3, -0.3, -0.5);
        this.camera.add(gunGroup);
        this.gun = gunGroup;
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

    shoot() {
        const now = performance.now();
        if (now - this.lastShot < this.shootingCooldown) return;
        
        this.lastShot = now;
        
        // Create bullet
        const bulletGeometry = new THREE.SphereGeometry(0.05);
        const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
        
        // Position bullet at gun tip
        bullet.position.copy(this.camera.position);
        
        // Get shooting direction from camera
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        
        // Store bullet data
        this.bullets.push({
            mesh: bullet,
            velocity: direction.multiplyScalar(this.bulletSpeed),
            created: now
        });
        
        // Add to scene
        this.scene.add(bullet);
        
        // Gun recoil animation
        this.gun.position.z += 0.1;
        setTimeout(() => {
            this.gun.position.z -= 0.1;
        }, 50);
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

    createZombie() {
        const zombieGroup = new THREE.Group();
        
        // Create materials with better colors
        const skinMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x55aa55,  // Sickly green
            roughness: 0.7,
            metalness: 0.3
        });
        const clothingMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x444466,  // Dark blue-grey for tattered clothes
            roughness: 0.9
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

        return {
            mesh: zombieGroup,
            health: 100,
            maxHealth: 100, // Add maxHealth for percentage calculation
            speed: 3 + Math.random() * 2,
            damage: 10,
            lastAttack: 0,
            attackCooldown: 1000,
            animation: walkingAnimation
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
            this.zombies.push(this.createZombie());
            this.zombiesRemainingToSpawn--;
            this.activeZombies++;
            this.lastZombieSpawn = now;
        }

        // Update existing zombies
        for (let i = this.zombies.length - 1; i >= 0; i--) {
            const zombie = this.zombies[i];
            
            // Update walking animation
            zombie.animation.time += delta * zombie.animation.speed;
            
            // Apply walking animation to legs and arms
            const legGroups = zombie.mesh.children.slice(-2); // Last two children are legs
            const armGroups = zombie.mesh.children.slice(-4, -2); // Second-to-last two children are arms
            
            legGroups.forEach((leg, index) => {
                const offset = index * Math.PI; // Opposite legs move in opposite directions
                leg.rotation.x = Math.sin(zombie.animation.time + offset) * 0.3;
            });
            
            armGroups.forEach((arm, index) => {
                const offset = index * Math.PI + Math.PI; // Arms move opposite to legs
                arm.rotation.x = Math.sin(zombie.animation.time + offset) * 0.3;
            });
            
            // Basic pathfinding: avoid other zombies while moving towards player
            const avoidanceForce = new THREE.Vector3();
            this.zombies.forEach(otherZombie => {
                if (otherZombie !== zombie) {
                    const diff = new THREE.Vector3().subVectors(
                        zombie.mesh.position, 
                        otherZombie.mesh.position
                    );
                    const dist = diff.length();
                    if (dist < 3) { // Avoidance radius
                        avoidanceForce.add(diff.normalize().multiplyScalar(1 / dist));
                    }
                }
            });
            
            // Combine avoidance with player direction
            const toPlayer = new THREE.Vector3().subVectors(
                this.camera.position, 
                zombie.mesh.position
            );
            toPlayer.y = 0;
            toPlayer.normalize();
            
            const finalDirection = toPlayer.add(avoidanceForce.multiplyScalar(0.5));
            finalDirection.normalize();
            
            // Move zombie
            zombie.mesh.position.add(finalDirection.multiplyScalar(delta * zombie.speed));
            zombie.mesh.lookAt(this.camera.position);
            
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
                    
                    // Damage zombie and update health bar
                    zombie.health -= 34;
                    
                    // Remove zombie if dead
                    if (zombie.health <= 0) {
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
        const windowMaterial = new THREE.MeshBasicMaterial({
            color: new THREE.Color(Math.random(), Math.random(), 1),
            emissive: new THREE.Color(Math.random(), Math.random(), 1),
            emissiveIntensity: 1
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
        const neonMaterial = new THREE.MeshBasicMaterial({
            color: neonColor,
            emissive: neonColor,
            emissiveIntensity: 2
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
            this.updateHealthDisplay();
        }
        
        this.renderer.render(this.scene, this.camera);
        this.prevTime = performance.now();
    }
}

// Start the game
new Game(); 