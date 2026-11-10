
import {
    world,
    system,
    Entity,
    EntityComponentTypes,
    EntityRideableComponent,
    Player,
} from "@minecraft/server";

// Change this to the namespace in anvilconfig.json.
const VEHICLE_ID = "simveh:mini_car";

// Vehicle tuning
const MAX_FORWARD_SPEED = 0.38;
const MAX_REVERSE_SPEED = 0.18;

const TURN_RATE = 2.0;          // Degrees per tick
const VELOCITY_RESPONSE = 0.20; // Acceleration/braking response

const SEARCH_DISTANCE = 6;

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

/**
 * Find the Mini Car currently being ridden by this player.
 *
 * This prototype assumes the vehicle has one seat.
 */
function findDrivenVehicle(player: Player): Entity | undefined {
    const nearbyVehicles = player.dimension.getEntities({
        type: VEHICLE_ID,
        location: player.location,
        maxDistance: SEARCH_DISTANCE,
    });

    for (const vehicle of nearbyVehicles) {
        const rideable = vehicle.getComponent(
            EntityComponentTypes.Rideable
        ) as EntityRideableComponent | undefined;

        if (!rideable) continue;

        const riders = rideable.getRiders();

        if (riders.some(rider => rider.id === player.id)) {
            return vehicle;
        }
    }

    return undefined;
}

/**
 * Convert driver input into vehicle movement.
 */
function driveVehicle(player: Player, vehicle: Entity): void {
    try {
        // X: left/right
        // Y: forward/backward
        const input = player.inputInfo.getMovementVector();

        const steering = clamp(input.x, -1, 1);
        const throttle = clamp(input.y, -1, 1);

        const rotation = vehicle.getRotation();
        const velocity = vehicle.getVelocity();

        // Minecraft entity yaw is measured in degrees.
        const currentYaw = rotation.y;
        const yawRadians = currentYaw * Math.PI / 180;

        // Current vehicle forward direction.
        const forwardX = -Math.sin(yawRadians);
        const forwardZ = Math.cos(yawRadians);

        // Calculate current forward speed.
        const currentForwardSpeed =
            velocity.x * forwardX +
            velocity.z * forwardZ;

        // Determine steering direction.
        // Reverse steering is inverted when backing up.
        let travelDirection = Math.sign(currentForwardSpeed);

        if (travelDirection === 0) {
            travelDirection = Math.sign(throttle);
        }

        const speedRatio = clamp(
            Math.abs(currentForwardSpeed) / MAX_FORWARD_SPEED,
            0,
            1
        );

        // Turn less when moving slowly.
        const steeringStrength = Math.max(0.20, speedRatio);

        const newYaw = currentYaw -
            steering *
            TURN_RATE *
            steeringStrength *
            travelDirection;

        // Apply vehicle rotation.
        vehicle.setRotation({
            x: rotation.x,
            y: newYaw,
        });

        // Recalculate forward direction after steering.
        const newYawRadians = newYaw * Math.PI / 180;

        const newForwardX = -Math.sin(newYawRadians);
        const newForwardZ = Math.cos(newYawRadians);

        // Forward and reverse speed.
        const targetSpeed = throttle >= 0
            ? throttle * MAX_FORWARD_SPEED
            : throttle * MAX_REVERSE_SPEED;

        // Desired horizontal velocity.
        const targetVelocityX = newForwardX * targetSpeed;
        const targetVelocityZ = newForwardZ * targetSpeed;

        // Correct the current velocity gradually.
        const impulseX =
            (targetVelocityX - velocity.x) * VELOCITY_RESPONSE;

        const impulseZ =
            (targetVelocityZ - velocity.z) * VELOCITY_RESPONSE;

        vehicle.applyImpulse({
            x: impulseX,
            y: 0,
            z: impulseZ,
        });

    } catch (error) {
        console.warn(
            `[Mini Car] Controller error: ${error}`
        );
    }
}

// Run the vehicle controller every game tick.
system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
        const vehicle = findDrivenVehicle(player);

        if (!vehicle) continue;

        driveVehicle(player, vehicle);
    }
}, 1);
