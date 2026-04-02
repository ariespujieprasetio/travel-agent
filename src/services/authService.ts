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

  let user = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  const isNewUser = !user;

  if (!user) {
    user = await prisma.user.create({
      data: {
        name: payload.name,
        email: payload.email,
        password: '', 
      },
    });
  }

  const token = generateToken({
    userId: user.id,
    email: user.email,
  }, isNewUser); 

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    token,
  };
}

export async function loginUser(email: string, password: string, rememberMe: boolean = false) {
  const user = await prisma.user.findUnique({
    where: { email },
  });
  
  if (!user) {
    throw new Error("Invalid credentials");
  }
  
  const isPasswordValid = await bcrypt.compare(password, user.password);
  
  if (!isPasswordValid) {
    throw new Error("Invalid credentials");
  }
  
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

export async function registerUser(email: string, password: string, name?: string, rememberMe: boolean = false) {
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });
  
  if (existingUser) {
    throw new Error("User already exists");
  }
  
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
    },
  });
  
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

export async function isAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true }
  });
  
  return !!user?.isAdmin;
}

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

export async function createAdminUser(email: string, password: string, name?: string) {
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });
  
  if (existingUser) {
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
  
  const hashedPassword = await bcrypt.hash(password, 10);
  
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