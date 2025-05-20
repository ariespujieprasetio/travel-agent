// src/utils/config.ts

import dotenv from 'dotenv';
dotenv.config();

export const PORT = process.env.PORT || 5600;

export const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
export const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';

export const MYSQL_HOST = process.env.MYSQL_HOST || 'localhost';
export const MYSQL_USER = process.env.MYSQL_USER || 'root';
export const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || '';
export const MYSQL_DATABASE = process.env.MYSQL_DATABASE || 'your_database_name';

export const SESSION_SECRET = process.env.SESSION_SECRET || 'your_session_secret';