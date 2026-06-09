import { Room } from "./Room";
import { randomId } from "./util";

/** Owns every active lobby. Auto-matchmaking is intentionally dumb — first
 * room with space, else spin up a new one — since capacity per box is small
 * enough that smarter placement wouldn't change much. */
export class RoomManager {
  private rooms = new Map<string, Room>();

  assignRoom(): Room {
    for (const room of this.rooms.values()) {
      if (!room.isFull) return room;
    }
    const room = new Room(randomId("room"));
    this.rooms.set(room.id, room);
    room.start();
    return room;
  }

  getRoom(id: string): Room | undefined {
    return this.rooms.get(id);
  }

  /** Call after a player leaves a room — reaps it if that emptied it out. */
  reapIfEmpty(room: Room) {
    if (room.isEmpty) {
      room.stop();
      this.rooms.delete(room.id);
    }
  }

  stats() {
    return [...this.rooms.values()].map((r) => ({
      id: r.id,
      players: r.realPlayerCount(),
    }));
  }
}
