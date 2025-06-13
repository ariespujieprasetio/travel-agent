import bcrypt from "bcrypt";
import prisma from "../models/prisma";
import { generateToken } from "../utils/jwt";
import { OAuth2Client } from 'google-auth-library';


const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function authenticateWithGoogle(idToken: string) {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();

  if (!payload || !payload.email || !payload.name) {
    throw new Error("Invalid token payload");
  }

  // Cek apakah user sudah ada
  let user = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  // Kalau belum ada, artinya register
  const isNewUser = !user;

  if (!user) {
    user = await prisma.user.create({
      data: {
        name: payload.name,
        email: payload.email,
        password: '', // Kosong karena OAuth
      },
    });
  }

  // Buat JWT token
  const token = generateToken({
    userId: user.id,
    email: user.email,
  }, isNewUser); // Kalau baru register, gunakan expire panjang

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    token,
  };
}

// Update loginUser function to accept rememberMe parameter
export async function loginUser(email: string, password: string, rememberMe: boolean = false) {
  // Find the user
  const user = await prisma.user.findUnique({
    where: { email },
  });
  
  if (!user) {
    throw new Error("Invalid credentials");
  }
  
  // Check password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  
  if (!isPasswordValid) {
    throw new Error("Invalid credentials");
  }
  
  // Generate token with extended expiration if remember me is checked
  const token = generateToken({
    userId: user.id,
    email: user.email,
  }, rememberMe);
  
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    token,
  };
}

// Update registerUser function to accept rememberMe parameter
export async function registerUser(email: string, password: string, name?: string, rememberMe: boolean = false) {
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });
  
  if (existingUser) {
    throw new Error("User already exists");
  }
  
  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);
  
  // Create the user
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
    },
  });
  
  // Generate token with extended expiration if remember me is checked
  const token = generateToken({
    userId: user.id,
    email: user.email,
  }, rememberMe);
  
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    token,
  };
}

// Add these new functions to the file

/**
 * Check if a user is an admin
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true }
  });
  
  return !!user?.isAdmin;
}

/**
 * Update user role
 */
export async function updateUserRole(userId: string, isAdmin: boolean) {
  return prisma.user.update({
    where: { id: userId },
    data: { isAdmin },
    select: {
      id: true,
      email: true,
      name: true,
      isAdmin: true
    }
  });
}

/**
 * Create admin user (for initialization)
 */
export async function createAdminUser(email: string, password: string, name?: string) {
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });
  
  if (existingUser) {
    // Update user to be admin if they exist
    return prisma.user.update({
      where: { id: existingUser.id },
      data: { isAdmin: true },
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true
      }
    });
  }
  
  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);
  
  // Create the admin user
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      isAdmin: true
    },
    select: {
      id: true,
      email: true,
      name: true,
      isAdmin: true
    }
  });
  
  return user;
}