const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 1000;
canvas.height = 600;

// ==========================
// WORLD / CAMERA
// ==========================

const WORLD_WIDTH = 3600;
const GROUND_Y = 520;

const camera = {
    x: 0
};

// ==========================
// GLOBAL ANIMATION CLOCK
// ==========================

let time = 0;

// ==========================
// STARS
// ==========================

const stars = [];

for (let i = 0; i < 110; i++) {
    stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * 320,
        size: Math.random() * 1.8 + 0.6,
        phase: Math.random() * Math.PI * 2,
        speed: 0.02 + Math.random() * 0.03
    });
}

// ==========================
// FLOATING SOUL MOTES (background ambiance)
// ==========================

const motes = [];

for (let i = 0; i < 24; i++) {
    motes.push({
        worldX: Math.random() * WORLD_WIDTH,
        baseY: 150 + Math.random() * 350,
        size: Math.random() * 2 + 1.5,
        phase: Math.random() * Math.PI * 2,
        driftSpeed: 0.008 + Math.random() * 0.012,
        bobRange: 15 + Math.random() * 20
    });
}

// ==========================
// PLAYER
// ==========================

const player = {
    x: 100,
    y: 400,

    width: 40,
    height: 60,

    velocityX: 0,
    velocityY: 0,

    speed: 5,
    jumpPower: 14,

    gravity: 0.7,

    grounded: false,
    jumpsRemaining: 2,

    lives: 3,
    invulnerable: 0,

    facing: 1,
    walkCycle: 0,
    idleTime: 0,
    capeSway: 0
};


// ==========================
// PLATFORMS
// ==========================

const platforms = [
    { x: 250,  y: 420, width: 200, height: 25 },
    { x: 550,  y: 330, width: 180, height: 25 },
    { x: 800,  y: 440, width: 150, height: 25 },
    { x: 1050, y: 360, width: 160, height: 25 },
    { x: 1300, y: 460, width: 140, height: 25 },
    { x: 1500, y: 300, width: 150, height: 25 },
    { x: 1750, y: 420, width: 180, height: 25 },
    { x: 2000, y: 350, width: 150, height: 25 },
    { x: 2250, y: 460, width: 160, height: 25 },
    { x: 2500, y: 380, width: 140, height: 25 },
    { x: 2750, y: 300, width: 150, height: 25 },
    { x: 3000, y: 420, width: 180, height: 25 },
    { x: 3250, y: 360, width: 150, height: 25 }
];

// ==========================
// GROUND DECORATION (deterministic — computed once, not per frame)
// ==========================

const groundPebbles = [];

for (let i = 0; i < 60; i++) {
    // Simple deterministic pseudo-randomness so pebbles don't shift on reload
    const seedA = Math.sin(i * 12.9898) * 43758.5453;
    const seedB = Math.sin(i * 78.233) * 12345.6789;

    groundPebbles.push({
        x: (Math.abs(seedA) % 1) * WORLD_WIDTH,
        y: 10 + (Math.abs(seedB) % 1) * 55,
        size: 2 + (Math.abs(seedA * seedB) % 1) * 3,
        shade: i % 2 === 0 ? "rgba(60, 44, 30, 0.6)" : "rgba(90, 70, 50, 0.5)"
    });
}

// ==========================
// SHADOW WALKER ENEMIES
// ==========================

const enemies = [
    {
        x: 820,
        y: 440 - 36,
        width: 34,
        height: 36,
        minX: 805,
        maxX: 915,
        speed: 0.9,
        direction: 1,
        alive: true,
        walkCycle: 0
    },
    {
        x: 1770,
        y: 420 - 36,
        width: 34,
        height: 36,
        minX: 1755,
        maxX: 1925,
        speed: 1.1,
        direction: 1,
        alive: true,
        walkCycle: 0
    },
    {
        x: 2770,
        y: 300 - 36,
        width: 34,
        height: 36,
        minX: 2755,
        maxX: 2895,
        speed: 1.3,
        direction: -1,
        alive: true,
        walkCycle: 0
    }
];

let gameOver = false;

// ==========================
// SOUL SHARDS
// ==========================

const soulShards = [
    { x: 330,  y: 360, width: 20, height: 30, collected: false },
    { x: 620,  y: 270, width: 20, height: 30, collected: false },
    { x: 850,  y: 380, width: 20, height: 30, collected: false },
    { x: 1560, y: 210, width: 20, height: 30, collected: false }, // needs double jump
    { x: 1830, y: 360, width: 20, height: 30, collected: false },
    { x: 2080, y: 280, width: 20, height: 30, collected: false },
    { x: 2810, y: 210, width: 20, height: 30, collected: false }  // needs double jump
];

let soulShardsCollected = 0;
const totalSoulShards = soulShards.length;

// ==========================
// SOUL PORTAL
// ==========================

const portal = {
    x: WORLD_WIDTH - 150,
    y: 440,
    width: 50,
    height: 80,
    active: false
};

let gameWon = false;
let enteringPortal = false;
let portalTimer = 0;
let portalPulse = 0;


// ==========================
// CONTROLS
// ==========================

const keys = {
    left: false,
    right: false
};

document.addEventListener("keydown", (event) => {

    if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
        keys.left = true;
    }

    if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
        keys.right = true;
    }

});

document.addEventListener("keyup", (event) => {

    if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
        keys.left = false;
    }

    if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
        keys.right = false;
    }

});


// ==========================
// JUMP
// ==========================

document.addEventListener("keydown", (event) => {

    if (
        event.key === "ArrowUp" ||
        event.key.toLowerCase() === "w" ||
        event.code === "Space"
    ) {

        if (player.jumpsRemaining > 0) {

            player.velocityY = -player.jumpPower;
            player.grounded = false;
            player.jumpsRemaining--;
        }
    }

});


// ==========================
// RESTART KEY (separate listener — was nested inside jump before)
// ==========================

document.addEventListener("keydown", (event) => {

    if ((gameWon || gameOver) && event.key.toLowerCase() === "r") {
        restartGame();
    }

});


// ==========================
// UPDATE CAMERA
// ==========================

function updateCamera() {

    const maxCameraX = WORLD_WIDTH - canvas.width;

    camera.x = player.x + player.width / 2 - canvas.width / 2;

    if (camera.x < 0) camera.x = 0;
    if (camera.x > maxCameraX) camera.x = maxCameraX;
}


// ==========================
// UPDATE PLAYER
// ==========================

function updatePlayer() {

    // Horizontal movement
    if (keys.left) {
        player.velocityX = -player.speed;
        player.facing = -1;
    }
    else if (keys.right) {
        player.velocityX = player.speed;
        player.facing = 1;
    }
    else {
        player.velocityX = 0;
    }

    // Apply horizontal movement
    player.x += player.velocityX;

    // Keep the player inside the world bounds
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > WORLD_WIDTH) {
        player.x = WORLD_WIDTH - player.width;
    }

    // Gravity
    player.velocityY += player.gravity;

    // Apply vertical movement
    player.y += player.velocityY;

    // Ground collision
    player.grounded = false;

    if (player.y + player.height >= GROUND_Y) {

        player.y = GROUND_Y - player.height;
        player.velocityY = 0;
        player.grounded = true;
        player.jumpsRemaining = 2;
    }

    // Platform collision
    platforms.forEach((platform) => {

        const playerBottom = player.y + player.height;
        const playerRight = player.x + player.width;

        const isAbovePlatform =
            playerBottom <= platform.y + player.velocityY;

        const isFalling =
            player.velocityY >= 0;

        const overlapsHorizontally =
            playerRight > platform.x &&
            player.x < platform.x + platform.width;

        if (
            isAbovePlatform &&
            isFalling &&
            overlapsHorizontally
        ) {

            player.y = platform.y - player.height;
            player.velocityY = 0;
            player.grounded = true;
            player.jumpsRemaining = 2;
        }
    });

    // Walking animation timer
    if (player.grounded && player.velocityX !== 0) {
        player.walkCycle += 0.3;
    } else {
        player.walkCycle = 0;
    }

    // Idle breathing timer
    if (player.grounded && player.velocityX === 0) {
        player.idleTime += 0.05;
    } else {
        player.idleTime = 0;
    }

    // Cape sway timer — always active, faster when airborne
    player.capeSway += player.grounded ? 0.08 : 0.15;

    // Count down post-hit invulnerability
    if (player.invulnerable > 0) {
        player.invulnerable--;
    }

    updateCamera();
}


// ==========================
// UPDATE ENEMIES
// ==========================

function updateEnemies() {

    enemies.forEach((enemy) => {

        if (!enemy.alive) return;

        enemy.x += enemy.speed * enemy.direction;

        if (enemy.x <= enemy.minX) {
            enemy.x = enemy.minX;
            enemy.direction = 1;
        }

        if (enemy.x + enemy.width >= enemy.maxX) {
            enemy.x = enemy.maxX - enemy.width;
            enemy.direction = -1;
        }

        enemy.walkCycle += 0.15;
    });
}

// ==========================
// DAMAGE PLAYER (lose a life, respawn, brief invulnerability)
// ==========================

function damagePlayer() {

    if (player.invulnerable > 0) return;

    player.lives--;

    if (player.lives <= 0) {
        gameOver = true;
        return;
    }

    // Respawn at the start of the level with a clean slate
    player.x = 100;
    player.y = 400;
    player.velocityX = 0;
    player.velocityY = 0;
    player.jumpsRemaining = 2;
    camera.x = 0;

    player.invulnerable = 120; // ~2 seconds at 60fps
}

// ==========================
// CHECK ENEMY COLLISIONS
// ==========================

function checkEnemyCollisions() {

    if (player.invulnerable > 0) return;

    enemies.forEach((enemy) => {

        if (!enemy.alive) return;

        // Shrink the enemy's hurtbox in slightly from its drawn size,
        // so collisions match what the player actually sees, not the
        // full sprite bounding box (fixes it feeling "magnetic").
        const hurtboxPadding = 6;

        const enemyX = enemy.x + hurtboxPadding;
        const enemyY = enemy.y + hurtboxPadding;
        const enemyRight = enemy.x + enemy.width - hurtboxPadding;
        const enemyBottom = enemy.y + enemy.height - hurtboxPadding;

        const playerRight = player.x + player.width;
        const playerBottom = player.y + player.height;

        // How much the two boxes overlap on each axis
        const overlapX =
            Math.min(playerRight, enemyRight) - Math.max(player.x, enemyX);

        const overlapY =
            Math.min(playerBottom, enemyBottom) - Math.max(player.y, enemyY);

        // No overlap on either axis — not touching at all
        if (overlapX <= 0 || overlapY <= 0) return;

        // Whichever axis has the SMALLER overlap tells us which side
        // the player actually hit. If the vertical overlap is shallow,
        // the player just landed on top — that's a stomp, even if
        // gravity dragged them down fast this frame.
        const hitFromTop =
            overlapY < overlapX &&
            player.y < enemyY &&
            player.velocityY >= 0;

        if (hitFromTop) {
            enemy.alive = false;

            // Snap the player onto the enemy's former top so they don't
            // keep sinking into the same spot before the bounce kicks in
            player.y = enemy.y - player.height;
            player.velocityY = -player.jumpPower * 0.6;
            player.jumpsRemaining = 2;
        } else {
            damagePlayer();
        }
    });
}

// ==========================
// COLLECT SOUL SHARDS
// ==========================

function collectSoulShards() {

    soulShards.forEach((shard) => {

        if (!shard.collected) {

            const playerRight = player.x + player.width;
            const playerBottom = player.y + player.height;

            const shardRight = shard.x + shard.width;
            const shardBottom = shard.y + shard.height;

            const isTouching =
                player.x < shardRight &&
                playerRight > shard.x &&
                player.y < shardBottom &&
                playerBottom > shard.y;

            if (isTouching) {
                shard.collected = true;
                soulShardsCollected++;
            }
        }

    });
}

// ==========================
// CHECK PORTAL
// ==========================

function checkPortal() {

    if (soulShardsCollected === totalSoulShards) {
        portal.active = true;
    }

    if (portal.active) {

        const playerRight = player.x + player.width;
        const playerBottom = player.y + player.height;

        const portalRight = portal.x + portal.width;
        const portalBottom = portal.y + portal.height;

        const isTouchingPortal =
            player.x < portalRight &&
            playerRight > portal.x &&
            player.y < portalBottom &&
            playerBottom > portal.y;

        if (isTouchingPortal && !enteringPortal) {
            enteringPortal = true;
        }

    }
}

//===================
//Draw Player
//===================
function drawPlayer() {

    // Flash while invulnerable so it's obvious you can't be hit right now
    const isFlashing =
        player.invulnerable > 0 &&
        Math.floor(player.invulnerable / 6) % 2 === 0;

    ctx.save();
    if (isFlashing) ctx.globalAlpha = 0.35;

    // Flip the drawing horizontally if facing left
    if (player.facing === -1) {
        ctx.translate(player.x + player.width, 0);
        ctx.scale(-1, 1);
        ctx.translate(-player.x, 0);
    }

    const airborne = !player.grounded;
    const isWalking = player.grounded && player.velocityX !== 0;

    // Leg swing while walking, 0 when idle or airborne
    const legSwing = isWalking ? Math.sin(player.walkCycle) * 5 : 0;

    // Arms swing opposite the legs while walking, lift up when airborne,
    // sway gently while idle
    let armSwing;
    if (isWalking) {
        armSwing = Math.sin(player.walkCycle + Math.PI) * 5;
    } else if (airborne) {
        armSwing = -8;
    } else {
        armSwing = Math.sin(player.idleTime) * 1.5;
    }

    // Legs tuck up slightly when airborne (jumping pose)
    const legTuck = airborne ? 6 : 0;
    const legHeight = airborne ? 12 : 18;

    // Gentle breathing bob for the upper body while standing still
    const bob = (!isWalking && !airborne) ? Math.sin(player.idleTime) * 2 : 0;

    // Cape sway — always moving, flares out more when jumping
    const capeFlare = airborne ? 16 : 6;
    const capeSwayX = Math.sin(player.capeSway) * (airborne ? 6 : 3);

    // ---- CAPE (drawn first, so it sits behind the body) ----
    ctx.fillStyle = "#3d1152";

    ctx.beginPath();
    ctx.moveTo(player.x + 10, player.y + 20 + bob);
    ctx.quadraticCurveTo(
        player.x - 10 - capeFlare + capeSwayX, player.y + 32,
        player.x + 8, player.y + 48
    );
    ctx.quadraticCurveTo(
        player.x - 2, player.y + 35,
        player.x + 10, player.y + 20 + bob
    );
    ctx.closePath();
    ctx.fill();

    // ---- LEGS ----
    ctx.fillStyle = "#2b1b12";

    ctx.fillRect(
        player.x + 6,
        player.y + 42 + legSwing - legTuck,
        10,
        legHeight
    );

    ctx.fillRect(
        player.x + 24,
        player.y + 42 - legSwing - legTuck,
        10,
        legHeight
    );

    // ---- BODY / CLOAK (with gradient shading) ----
    const bodyGradient = ctx.createLinearGradient(
        player.x, player.y + 22,
        player.x + 30, player.y + 47
    );
    bodyGradient.addColorStop(0, "#a80000");
    bodyGradient.addColorStop(1, "#5c0000");

    ctx.fillStyle = bodyGradient;

    ctx.fillRect(
        player.x + 5,
        player.y + 22 + bob,
        30,
        25
    );

    // ---- BELT ----
    ctx.fillStyle = "#d4af37";

    ctx.fillRect(
        player.x + 5,
        player.y + 40 + bob,
        30,
        4
    );

    // ---- ARMS ----
    ctx.fillStyle = "#6e0000";

    ctx.fillRect(
        player.x + 1,
        player.y + 24 + bob + armSwing,
        6,
        16
    );

    ctx.fillRect(
        player.x + 33,
        player.y + 24 + bob - armSwing,
        6,
        16
    );

    // ---- HEAD ----
    ctx.fillStyle = "#f1c27d";

    ctx.beginPath();
    ctx.arc(
        player.x + 20,
        player.y + 14 + bob,
        12,
        0,
        Math.PI * 2
    );
    ctx.fill();

    // ---- HAIR ----
    ctx.fillStyle = "#2b1b12";

    ctx.beginPath();
    ctx.arc(
        player.x + 20,
        player.y + 9 + bob,
        12,
        Math.PI,
        Math.PI * 2
    );
    ctx.fill();

    // ---- EYES ----
    ctx.fillStyle = "#ffffff";

    ctx.fillRect(player.x + 14, player.y + 13 + bob, 4, 4);
    ctx.fillRect(player.x + 23, player.y + 13 + bob, 4, 4);

    // ---- PUPILS ----
    ctx.fillStyle = "#111111";

    ctx.fillRect(player.x + 15, player.y + 14 + bob, 2, 2);
    ctx.fillRect(player.x + 24, player.y + 14 + bob, 2, 2);

    ctx.restore();
}

// ==========================
// DRAW SOUL SHARDS
// ==========================

function drawSoulShards() {

    soulShards.forEach((shard) => {

        if (!shard.collected) {

            // Magical glow
            ctx.shadowColor = "#bedeef";
            ctx.shadowBlur = 25;

            // Bright crystal
            ctx.fillStyle = "#4bb43b";

            ctx.beginPath();

            ctx.moveTo(
                shard.x + shard.width / 2,
                shard.y
            );

            ctx.lineTo(
                shard.x + shard.width,
                shard.y + shard.height / 2
            );

            ctx.lineTo(
                shard.x + shard.width / 2,
                shard.y + shard.height
            );

            ctx.lineTo(
                shard.x,
                shard.y + shard.height / 2
            );

            ctx.closePath();
            ctx.fill();

            // Reset the glow
            ctx.shadowBlur = 0;
        }

    });
}
// ==========================
// DRAW ENEMIES
// ==========================

function drawEnemies() {

    enemies.forEach((enemy) => {

        if (!enemy.alive) return;

        const bob = Math.sin(enemy.walkCycle) * 3;
        const centerX = enemy.x + enemy.width / 2;
        const topY = enemy.y + bob;

        ctx.save();

        // Dark magical glow
        ctx.shadowColor = "#7b2ff7";
        ctx.shadowBlur = 18;

        // Wispy body — a rounded silhouette that tapers at the bottom
        ctx.fillStyle = "#1b0f2e";

        ctx.beginPath();
        ctx.moveTo(centerX, topY);
        ctx.quadraticCurveTo(
            enemy.x + enemy.width, topY + 10,
            enemy.x + enemy.width - 4, topY + enemy.height - 6
        );
        ctx.quadraticCurveTo(
            centerX, topY + enemy.height + 6,
            enemy.x + 4, topY + enemy.height - 6
        );
        ctx.quadraticCurveTo(
            enemy.x, topY + 10,
            centerX, topY
        );
        ctx.closePath();
        ctx.fill();

        ctx.shadowBlur = 0;

        // Glowing eyes — face whichever way it's currently walking
        ctx.fillStyle = "#e0aaff";
        const eyeOffset = enemy.direction === 1 ? 4 : -4;

        ctx.beginPath();
        ctx.arc(centerX - 6 + eyeOffset, topY + 14, 3, 0, Math.PI * 2);
        ctx.arc(centerX + 6 + eyeOffset, topY + 14, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    });
}

// ==========================
// DRAW HUD
// ==========================

function drawHUD() {

    ctx.fillStyle = "white";
    ctx.font = "bold 24px Arial";

    ctx.fillText(
        `Soul Shards: ${soulShardsCollected} / ${totalSoulShards}`,
        25,
        40
    );

    // Hearts (lives)
    for (let i = 0; i < 3; i++) {

        const heartX = 25 + i * 32;
        const heartY = 55;
        const filled = i < player.lives;

        ctx.fillStyle = filled ? "#ff5c5c" : "rgba(255,255,255,0.25)";

        ctx.beginPath();
        ctx.moveTo(heartX + 10, heartY + 18);
        ctx.bezierCurveTo(
            heartX - 8, heartY + 4,
            heartX + 2, heartY - 8,
            heartX + 10, heartY + 4
        );
        ctx.bezierCurveTo(
            heartX + 18, heartY - 8,
            heartX + 28, heartY + 4,
            heartX + 10, heartY + 18
        );
        ctx.closePath();
        ctx.fill();
    }

    // Small progress-through-the-level indicator
    const progress = Math.min(
        1,
        (player.x) / (WORLD_WIDTH - player.width)
    );

    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillRect(canvas.width - 220, 25, 195, 10);

    ctx.fillStyle = "#c77dff";
    ctx.fillRect(canvas.width - 220, 25, 195 * progress, 10);
}
// ==========================
// DRAW PORTAL
// ==========================

function drawPortal() {

    if (!portal.active) return;

    // Animate the portal
    portalPulse += 0.05;

    const pulseSize = Math.sin(portalPulse) * 6;

    const centerX = portal.x + portal.width / 2;
    const centerY = portal.y + portal.height / 2;


    // Outer magical glow
    ctx.shadowColor = "#9d4edd";
    ctx.shadowBlur = 35 + pulseSize;

    ctx.fillStyle = "#5a189a";

    ctx.beginPath();
    ctx.ellipse(
        centerX,
        centerY,
        portal.width / 2 + pulseSize,
        portal.height / 2 + pulseSize,
        0,
        0,
        Math.PI * 2
    );
    ctx.fill();


    // Inner portal
    ctx.shadowBlur = 15;

    ctx.fillStyle = "#c77dff";

    ctx.beginPath();
    ctx.ellipse(
        centerX,
        centerY,
        portal.width / 2 - 10,
        portal.height / 2 - 10,
        0,
        0,
        Math.PI * 2
    );
    ctx.fill();


    // Portal core
    ctx.shadowBlur = 0;

    ctx.fillStyle = "#240046";

    ctx.beginPath();
    ctx.ellipse(
        centerX,
        centerY,
        portal.width / 2 - 18,
        portal.height / 2 - 18,
        0,
        0,
        Math.PI * 2
    );
    ctx.fill();

    ctx.shadowBlur = 0;

    // Orbiting particle swirl around the portal
    ctx.fillStyle = "#e0aaff";
    ctx.shadowColor = "#c77dff";
    ctx.shadowBlur = 8;

    for (let p = 0; p < 6; p++) {
        const angle = portalPulse * 1.5 + (p * Math.PI * 2) / 6;
        const orbitRx = portal.width / 2 + 14;
        const orbitRy = portal.height / 2 + 14;

        const px = centerX + Math.cos(angle) * orbitRx;
        const py = centerY + Math.sin(angle) * orbitRy;

        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.shadowBlur = 0;
}

// ==========================
// DRAW STARS
// ==========================

function drawStars() {

    stars.forEach((star) => {

        const twinkle = 0.5 + Math.sin(time * star.speed + star.phase) * 0.5;

        ctx.globalAlpha = 0.35 + twinkle * 0.65;
        ctx.fillStyle = "#ffffff";

        ctx.beginPath();
        ctx.arc(
            star.x,
            star.y,
            star.size + twinkle * 0.6,
            0,
            Math.PI * 2
        );
        ctx.fill();

        // A soft glow on the brighter stars only, for a bit of sparkle
        if (twinkle > 0.75) {
            ctx.globalAlpha = (twinkle - 0.75) * 1.5;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size * 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    ctx.globalAlpha = 1;
}

// ==========================
// DRAW FLOATING SOUL MOTES
// ==========================

function drawMotes() {

    const parallax = 0.5;
    const screenOffset = camera.x * parallax;

    motes.forEach((mote) => {

        // Wrap the mote's world position into a repeating band so we
        // never run out of them as the camera scrolls
        const wrapped = ((mote.worldX - screenOffset) % (canvas.width + 200) + (canvas.width + 200)) % (canvas.width + 200);
        const screenX = wrapped - 100;

        const bob = Math.sin(time * mote.driftSpeed + mote.phase) * mote.bobRange;
        const screenY = mote.baseY + bob;

        const glow = 0.4 + Math.sin(time * mote.driftSpeed * 2 + mote.phase) * 0.3;

        ctx.shadowColor = "#c77dff";
        ctx.shadowBlur = 12;
        ctx.globalAlpha = glow;
        ctx.fillStyle = "#e0aaff";

        ctx.beginPath();
        ctx.arc(screenX, screenY, mote.size, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
}

// ==========================
// DRAW MOUNTAINS (tiled so they cover the whole scrolling world)
// ==========================

function drawMountainShape(startX, baseY, peakOffsets) {

    ctx.beginPath();
    ctx.moveTo(startX + 0, baseY);

    peakOffsets.forEach((point) => {
        ctx.lineTo(startX + point[0], baseY - point[1]);
    });

    ctx.lineTo(startX + 1000, baseY);
    ctx.closePath();
    ctx.fill();
}

const farPeaks = [
    [120, 190], [250, 0], [380, 160], [520, 0],
    [650, 210], [800, 0], [920, 170], [1000, 0]
];

const nearPeaks = [
    [80, 130], [220, 20], [340, 155], [480, 10],
    [630, 100], [760, 5], [900, 145], [1000, 0]
];

function drawMountains() {

    // Far range — lighter, slower parallax
    ctx.fillStyle = "#332a5c";

    const patternWidth = 1000;
    const farOffset = -((camera.x * 0.15) % patternWidth);
    const tilesNeeded = Math.ceil(canvas.width / patternWidth) + 2;

    for (let i = -1; i < tilesNeeded; i++) {
        drawMountainShape(farOffset + i * patternWidth, 520, farPeaks);
    }

    // Near range — darker, faster parallax, sits in front of the far range
    ctx.fillStyle = "#20183d";

    const nearOffset = -((camera.x * 0.32) % patternWidth);

    for (let i = -1; i < tilesNeeded; i++) {
        drawMountainShape(nearOffset + i * patternWidth, 520, nearPeaks);
    }
}

// ==========================
// DRAW AURORA WISPS
// ==========================

function drawAurora() {

    const sway = camera.x * 0.04;

    const wisps = [
        { x: 100 - sway, y: 90, w: 420, h: 70, color: "rgba(157, 78, 221, 0.18)", speed: 0.006 },
        { x: 480 - sway, y: 150, w: 500, h: 60, color: "rgba(90, 150, 220, 0.14)", speed: 0.009 },
        { x: -150 - sway, y: 60, w: 380, h: 50, color: "rgba(199, 125, 255, 0.15)", speed: 0.007 }
    ];

    wisps.forEach((wisp) => {

        const bob = Math.sin(time * wisp.speed) * 12;

        ctx.save();
        ctx.translate(wisp.x, wisp.y + bob);
        ctx.rotate(Math.sin(time * wisp.speed * 0.5) * 0.05);

        const gradient = ctx.createRadialGradient(
            wisp.w / 2, wisp.h / 2, 0,
            wisp.w / 2, wisp.h / 2, wisp.w / 2
        );
        gradient.addColorStop(0, wisp.color);
        gradient.addColorStop(1, "rgba(0,0,0,0)");

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, wisp.w, wisp.h * 2);

        ctx.restore();
    });
}

// ==========================
// DRAW WORLD
// ==========================

function drawWorld() {

    // Sky gradient (fixed to the screen — it's the same everywhere)
    const skyGradient = ctx.createLinearGradient(
        0, 0,
        0, canvas.height
    );

    skyGradient.addColorStop(0, "#0d0b30");
    skyGradient.addColorStop(0.35, "#1b1464");
    skyGradient.addColorStop(0.65, "#4c3b8f");
    skyGradient.addColorStop(1, "#8b6fb8");

    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawAurora();
    drawStars();

    // Moon
    const moonX = 820;
    const moonY = 110;
    const moonRadius = 45;

    // Outer soft halo
    const haloGradient = ctx.createRadialGradient(
        moonX, moonY, moonRadius * 0.6,
        moonX, moonY, moonRadius * 2.4
    );
    haloGradient.addColorStop(0, "rgba(245, 240, 200, 0.35)");
    haloGradient.addColorStop(1, "rgba(245, 240, 200, 0)");

    ctx.fillStyle = haloGradient;
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonRadius * 2.4, 0, Math.PI * 2);
    ctx.fill();

    // Moon body
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 20;

    ctx.fillStyle = "#f5f0c8";
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    // Craters
    ctx.fillStyle = "rgba(190, 175, 140, 0.5)";
    ctx.beginPath();
    ctx.arc(moonX - 14, moonY - 8, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(moonX + 12, moonY + 12, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(moonX + 4, moonY - 18, 4, 0, Math.PI * 2);
    ctx.fill();

    // Distant mountains (parallax, tiled across the world)
    drawMountains();

    drawMotes();

    // Everything below scrolls 1:1 with the world, so we translate the
    // canvas by the camera position for the rest of the scene.
    ctx.save();
    ctx.translate(-camera.x, 0);

    // Ground — gradient dirt with a jagged grass line on top
    const groundGradient = ctx.createLinearGradient(0, GROUND_Y, 0, GROUND_Y + 80);
    groundGradient.addColorStop(0, "#4a3527");
    groundGradient.addColorStop(1, "#241a13");

    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, GROUND_Y, WORLD_WIDTH, 80);

    // Jagged grass edge instead of a flat bar
    ctx.fillStyle = "#5a8a4f";
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);

    const grassStep = 18;
    for (let gx = 0; gx <= WORLD_WIDTH; gx += grassStep) {
        const jag = Math.sin(gx * 0.4) * 3;
        ctx.lineTo(gx, GROUND_Y - 6 + jag);
    }

    ctx.lineTo(WORLD_WIDTH, GROUND_Y + 6);
    ctx.lineTo(0, GROUND_Y + 6);
    ctx.closePath();
    ctx.fill();

    // Scattered pebbles along the ground (deterministic, computed once)
    groundPebbles.forEach((pebble) => {
        ctx.fillStyle = pebble.shade;
        ctx.beginPath();
        ctx.ellipse(pebble.x, GROUND_Y + pebble.y, pebble.size, pebble.size * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
    });

    // Platforms
    platforms.forEach((platform, index) => {

        // Dirt body with a gradient for a bit of volume
        const platGradient = ctx.createLinearGradient(
            0, platform.y, 0, platform.y + platform.height
        );
        platGradient.addColorStop(0, "#6b4531");
        platGradient.addColorStop(1, "#3f2818");

        ctx.fillStyle = platGradient;
        ctx.fillRect(platform.x, platform.y + 6, platform.width, platform.height - 6);

        // Grass cap
        ctx.fillStyle = "#5a8a4f";
        ctx.fillRect(platform.x, platform.y, platform.width, 6);

        // Faint magical highlight along the front edge
        ctx.fillStyle = "rgba(199, 125, 255, 0.25)";
        ctx.fillRect(platform.x, platform.y + 5, platform.width, 1.5);

        // A couple of moss speckles per platform, deterministic per index
        ctx.fillStyle = "rgba(90, 138, 79, 0.6)";
        for (let m = 0; m < 3; m++) {
            const seed = (index * 7 + m * 13) % 100;
            const mossX = platform.x + (seed / 100) * platform.width;
            ctx.beginPath();
            ctx.ellipse(mossX, platform.y + 3, 5, 2.5, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    drawSoulShards();
    drawEnemies();
    drawPortal();
    drawPlayer();

    ctx.restore();
}

// ==========================
// RESTART GAME
// ==========================

function restartGame() {

    // Reset player
    player.x = 100;
    player.y = 400;
    player.velocityX = 0;
    player.velocityY = 0;
    player.jumpsRemaining = 2;
    player.lives = 3;
    player.invulnerable = 0;

    // Reset camera
    camera.x = 0;

    // Reset enemies
    enemies.forEach((enemy, i) => {
        enemy.alive = true;
        enemy.direction = (i === enemies.length - 1) ? -1 : 1;
        enemy.x = enemy.direction === 1 ? enemy.minX : enemy.maxX - enemy.width;
    });

    gameOver = false;

    // Reset Soul Shards
    soulShards.forEach((shard) => {
        shard.collected = false;
    });

    soulShardsCollected = 0;

    // Reset portal and game state
    portal.active = false;
    gameWon = false;
    enteringPortal = false;
    portalTimer = 0;
}

//============
//GAME LOOP
//============
function gameLoop() {

    time++;

    if (!gameWon && !gameOver) {

        if (!enteringPortal) {
            updatePlayer();
            updateEnemies();
            checkEnemyCollisions();
            collectSoulShards();
            checkPortal();
        } else {
            // Player enters the portal
            player.x += 3;
            updateCamera();

            // Player slowly disappears
            portalTimer++;

            if (portalTimer > 40) {
                gameWon = true;
            }
        }
    }

    drawWorld();
    drawHUD();

    if (gameWon) {
        ctx.fillStyle = "white";
        ctx.font = "bold 50px Arial";
        ctx.fillText("YOU WIN!", 380, 250);

        ctx.font = "24px Arial";
        ctx.fillText("Press R to play again", 390, 300);
    }

    if (gameOver) {
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#ff5c5c";
        ctx.font = "bold 50px Arial";
        ctx.fillText("YOU DIED", 370, 250);

        ctx.fillStyle = "white";
        ctx.font = "24px Arial";
        ctx.fillText("Press R to try again", 390, 300);
    }

    requestAnimationFrame(gameLoop);
}
gameLoop();