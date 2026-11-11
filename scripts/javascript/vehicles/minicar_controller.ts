
import {
    Entity,
    Player,
    system,
    world
} from "@minecraft/server";

const VEHICLE_ID = "simveh:mini_car";

// Change these if your input or model orientation differs.
const FORWARD_INPUT_SIGN = 1;
const STEERING_INPUT_SIGN = 1;
const MODEL_FORWARD_SIGN = 1;

// Movement values are in blocks/tick.
const CONFIG = {
    maxForwardSpeed: 0.40,
    maxReverseSpeed: 0.18,
    acceleration: 0.012,
    reverseAcceleration: 0.008,
    braking: 0.025,
    friction: 0.006,
    turnRate: 3.0,
    velocityResponse: 0.35
};

function clamp(
    value: number,
    min: number,
    max: number
): number {
    return Math.max(min, Math.min(max, value));
}

function approach(
    value: number,
    target: number,
    step: number
): number {
    if (value < target) {
        return Math.min(value + step, target);
    }

    return Math.max(value - step, target);
}

export class MiniCar {
    private entity: Entity;
    private player: Player;

    // Signed speed: forward positive, reverse negative.
    private speed = 0;

    private intervalId: number | undefined;

    constructor(entity: Entity, player: Player) {
        this.entity = entity;
        this.player = player;
    }

    start(): void {
        if (this.intervalId !== undefined) return;

        this.intervalId = system.runInterval(() => {
            if (!this.isDriving()) {
                this.stop();
                return;
            }

            try {
                this.update();
            } catch (error) {
                console.warn(`[MiniCar] ${error}`);
                this.stop();
            }
        }, 1);
    }

    stop(): void {
        if (this.intervalId !== undefined) {
            system.clearRun(this.intervalId);
            this.intervalId = undefined;
        }
    }

    private isDriving(): boolean {
        if (!this.entity.isValid || !this.player.isValid) {
            return false;
        }

        const rideable = this.entity.getComponent(
            "minecraft:rideable"
        );

        if (!rideable) return false;

        const riders = rideable.getRiders();

        // This prototype uses one driver seat.
        return riders.some(
            rider => rider.id === this.player.id
        );
    }

    private update(): void {
        const input = this.player.inputInfo.getMovementVector();

        const throttle = clamp(
            input.y * FORWARD_INPUT_SIGN,
            -1,
            1
        );

        const steering = clamp(
            input.x * STEERING_INPUT_SIGN,
            -1,
            1
        );

        this.updateSpeed(throttle);
        this.updateSteering(steering);
        this.updateMotion();
        this.updateHUD();
    }

    private updateSpeed(throttle: number): void {
        if (Math.abs(throttle) < 0.05) {
            // Slow down naturally without input.
            this.speed = approach(
                this.speed,
                0,
                CONFIG.friction
            );
        } else {
            const targetSpeed = throttle > 0
                ? throttle * CONFIG.maxForwardSpeed
                : throttle * CONFIG.maxReverseSpeed;

            // Apply stronger braking when changing direction.
            const changingDirection =
                this.speed * throttle < 0;

            const rate = changingDirection
                ? CONFIG.braking
                : throttle > 0
                    ? CONFIG.acceleration
                    : CONFIG.reverseAcceleration;

            this.speed = approach(
                this.speed,
                targetSpeed,
                rate
            );
        }

        if (Math.abs(this.speed) < 0.001) {
            this.speed = 0;
        }
    }

    private updateSteering(steering: number): void {
        if (Math.abs(steering) < 0.05) return;
        if (Math.abs(this.speed) < 0.005) return;

        const rotation = this.entity.getRotation();

        // Reverse driving changes the steering direction.
        const direction = Math.sign(this.speed);

        const speedFactor = clamp(
            Math.abs(this.speed) / CONFIG.maxForwardSpeed,
            0,
            1
        );

        // Minimum steering response at low speeds.
        const turningStrength = Math.max(
            0.2,
            speedFactor
        );

        const yawChange =
            steering *
            direction *
            CONFIG.turnRate *
            turningStrength;

        this.entity.setRotation({
            x: rotation.x,
            y: rotation.y - yawChange
        });
    }

    private updateMotion(): void {
        const rotation = this.entity.getRotation();
        const yaw = rotation.y * Math.PI / 180;

        // Minecraft yaw = 0 points toward positive Z.
        const forwardX =
            -Math.sin(yaw) * MODEL_FORWARD_SIGN;
        const forwardZ =
            Math.cos(yaw) * MODEL_FORWARD_SIGN;

        const targetX = forwardX * this.speed;
        const targetZ = forwardZ * this.speed;

        const velocity = this.entity.getVelocity();

        // Adjust horizontal velocity toward the target.
        // Leave vertical velocity alone for gravity.
        this.entity.applyImpulse({
            x: (targetX - velocity.x) *
                CONFIG.velocityResponse,
            y: 0,
            z: (targetZ - velocity.z) *
                CONFIG.velocityResponse
        });
    }

    private updateHUD(): void {
        const velocity = this.entity.getVelocity();

        const speed = Math.hypot(
            velocity.x,
            velocity.z
        );

        const kmh = speed * 20 * 3.6;

        const gear =
            this.speed > 0.005 ? "D" :
            this.speed < -0.005 ? "R" : "N";

        this.player.onScreenDisplay.setActionBar(
            `§eMini Car §7| §f${kmh.toFixed(1)} km/h` +
            ` §7| §b${gear}`
        );
    }
}

// Track active controllers by vehicle entity ID.
const activeCars = new Map<string, MiniCar>();

system.runInterval(() => {
    const occupiedCars = new Set<string>();

    for (const player of world.getAllPlayers()) {
        const vehicles = player.dimension.getEntities({
            type: VEHICLE_ID,
            location: player.location,
            maxDistance: 8
        });

        for (const vehicle of vehicles) {
            const rideable = vehicle.getComponent(
                "minecraft:rideable"
            );

            if (!rideable) continue;

            const riders = rideable.getRiders();

            if (!riders.some(r => r.id === player.id)) {
                continue;
            }

            occupiedCars.add(vehicle.id);

            if (!activeCars.has(vehicle.id)) {
                const car = new MiniCar(vehicle, player);
                activeCars.set(vehicle.id, car);
                car.start();
            }

            break;
        }
    }

    // Stop controllers whose drivers have dismounted.
    for (const [id, car] of activeCars) {
        if (!occupiedCars.has(id)) {
            car.stop();
            activeCars.delete(id);
        }
    }
}, 5);
