import { db } from "./db";
import { users, messages, type User, type InsertUser, type Message, type InsertMessage } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getUsers(): Promise<User[]>;
  getUserByTelegramId(telegramId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getMessages(): Promise<(Message & { user: User | null })[]>;
  createMessage(message: InsertMessage): Promise<Message>;
}

export class DatabaseStorage implements IStorage {
  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUserByTelegramId(telegramId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.telegramId, telegramId));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getMessages(): Promise<(Message & { user: User | null })[]> {
    return await db.select({
      id: messages.id,
      userId: messages.userId,
      messageId: messages.messageId,
      content: messages.content,
      rawData: messages.rawData,
      createdAt: messages.createdAt,
      user: users
    })
    .from(messages)
    .leftJoin(users, eq(messages.userId, users.id))
    .orderBy(desc(messages.createdAt))
    .limit(100);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(insertMessage).returning();
    return message;
  }
}

export const storage = new DatabaseStorage();
