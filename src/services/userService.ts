import bcrypt from "bcrypt";
import prisma from "../models/prisma";

/**
 * Get all users
 */
export async function getAllUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          chatSessions: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });
}

/**
 * Get user count
 */
export async function getUserCount() {
  return prisma.user.count();
}

/**
 * Get a user by ID
 */
export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          chatSessions: true
        }
      }
    }
  });
}

/**
 * Update user
 */
export async function updateUser(
  id: string,
  data: {
    email?: string;
    name?: string;
    isAdmin?: boolean;
  }
) {
  return prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      updatedAt: true
    }
  });
}

/**
 * Delete user
 */
export async function deleteUser(id: string) {
  // First delete all related data
  await prisma.message.deleteMany({
    where: {
      chatSession: {
        userId: id
      }
    }
  });
  
  await prisma.chatSession.deleteMany({
    where: {
      userId: id
    }
  });
  
  // Delete the user
  return prisma.user.delete({
    where: { id }
  });
}

/**
 * Change password
 */
export async function changePassword(id: string, newPassword: string) {
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  
  return prisma.user.update({
    where: { id },
    data: {
      password: hashedPassword
    }
  });
}