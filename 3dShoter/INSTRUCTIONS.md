# Zombie Survival Game

A first-person zombie survival game built with Three.js. Survive against waves of zombies in this simple but intense shooting experience.

## Game Overview

### Core Features
- First-person perspective
- Simple shooting mechanics
- Basic zombie AI
- Health system
- Wave-based zombie spawning

### Gameplay Elements

#### Player Mechanics
- WASD movement controls
- Mouse look for camera control
- Hold SPACE to shoot
- Health system (100 HP)
- Simple crosshair for aiming

#### Zombie Type
- Basic Zombie
  - Follows player
  - Moderate health
  - Deals damage on contact
  - Spawns in waves
  - Simple pathfinding

### Game Loop
1. Player starts with full health
2. Zombies spawn in waves
3. Player must shoot zombies to survive
4. Game ends when player’s health reaches 0

## Development Phases

### Phase 1: Basic Environment and Player Movement
- Set up Three.js project structure
- Create basic 3D environment (ground, sky)
- Implement first-person camera
- Add WASD movement controls
- Add mouse look controls
- Test basic movement and camera controls

### Phase 2: Shooting Mechanics
- Implement basic gun model
- Add shooting animation
- Create bullet system
- Add crosshair UI
- Implement bullet collision detection
- Test shooting mechanics

### Phase 3: Basic Zombie Implementation
- Create basic zombie model
- Implement zombie spawning system
- Add simple zombie movement
- Create basic zombie-player collision
- Test zombie behavior

### Phase 4: Zombie AI and Combat
- Implement zombie pathfinding
- Add zombie health system
- Create damage system
- Add wave-based spawning
- Test combat mechanics

### Phase 5: Polish and UI
- Add health system UI
- Implement game over state
- Add score system
- Create basic menu system
- Final testing and bug fixes

### Phase 6: Better Zombie Models

## 1. Basic Zombie Models:
- Create simple 3D models for zombies using primitive shapes
- Give them a distinct appearance (green color, humanoid shape)
- Place them randomly around the environment

## 2. Zombie Movement AI:
- Make zombies move toward the player when within a certain range

# 3. Enhanced Blood Effects

- Impact Splatter: Large red particle burst when zombies are hit
- Death Animation: More dramatic falling/dissolving effect
- Persistent Blood Pools: Small decals that remain on the ground
- Hit Feedback: Screen flash or hitmarker when successfully hitting zombies

## 4. sound effect
- Zombies should be making some noise when they are moving like groaning or something
- Player should be able to hear zombies when they are close by
- When I hit a zombie, I want to hear a loud thud sound

### Phase 7: More weapons and effects

- Shotgun:
  - Fires 3 bullets in a spread pattern
  - Appears as a pickup after completing a wave
  - Limited ammo (perhaps 10 shots)
  - Wider model with shorter barrel
  - Powerful against groups of zombies

- Machine Gun: Rapid-fire weapon with larger bullets
  - Appears as a different pickup after waves
  - Higher fire rate with no cooldown
  - Slightly lower damage per bullet but higher DPS
  - Distinctive longer model with visible magazine

- Weapon Pickup System:
  - Colorful floating weapon models that appear after each wave
  - Simple pickup by walking over them
  - HUD indicator showing current weapon and ammo



# Dynamic Lighting

- Player Flashlight: Attached to player view, illuminating where you look
  - Creates dramatic shadows as zombies approach
  - Limited cone of visibility in darker areas

- Enhanced Muzzle Flash: Brighter, larger flash that briefly illuminates surroundings
  - Creates momentary visibility in dark areas when shooting
  - Casts dynamic shadows on nearby zombies and objects