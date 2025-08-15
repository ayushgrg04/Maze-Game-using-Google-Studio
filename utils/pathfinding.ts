
import { BOARD_SIZE } from '../constants';
import type { Position, Wall } from '../types';

// Helper to check if a move between two cells is blocked by a wall
const isMoveBlocked = (from: Position, to: Position, walls: Wall[]): boolean => {
    const { r: fromR, c: fromC } = from;
    const { r: toR, c: toC } = to;

    if (fromR === toR) { // Horizontal move
        const wallC = Math.min(fromC, toC);
        return walls.some(w => w.orientation === 'vertical' && w.c === wallC + 1 && (w.r === fromR || w.r === fromR - 1));
    } else { // Vertical move
        const wallR = Math.min(fromR, toR);
        return walls.some(w => w.orientation === 'horizontal' && w.r === wallR + 1 && (w.c === fromC || w.c === fromC - 1));
    }
};

// Breadth-First Search to find the shortest path from a starting position to a goal row
export const findShortestPath = (startPos: Position, goalRow: number, walls: Wall[]): Position[] | null => {
    const queue: Position[][] = [[startPos]];
    const visited = new Set<string>([`${startPos.r},${startPos.c}`]);

    while (queue.length > 0) {
        const path = queue.shift()!;
        const currentPos = path[path.length - 1];

        if (currentPos.r === goalRow) {
            return path;
        }

        const { r, c } = currentPos;
        const neighbors = [{ r: r - 1, c }, { r: r + 1, c }, { r, c: c - 1 }, { r, c: c + 1 }];

        for (const neighbor of neighbors) {
            const neighborKey = `${neighbor.r},${neighbor.c}`;
            if (
                neighbor.r >= 0 && neighbor.r < BOARD_SIZE &&
                neighbor.c >= 0 && neighbor.c < BOARD_SIZE &&
                !visited.has(neighborKey) &&
                !isMoveBlocked(currentPos, neighbor, walls)
            ) {
                visited.add(neighborKey);
                const newPath = [...path, neighbor];
                queue.push(newPath);
            }
        }
    }

    return null; // No path found
};
