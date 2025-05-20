// src/utils/swagger.ts

import swaggerJsdoc from 'swagger-jsdoc';
import { version } from '../../package.json';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Travel Agent API Documentation',
      version,
      description: 'API documentation for the Travel Agent application',
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
      contact: {
        name: 'API Support',
        email: 'support@travelagent.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:5600/api',
        description: 'Development server',
      },
      {
        url: 'https://api.travelagent.com/api',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            id: {
              type: 'string',
              description: 'User ID',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            email: {
              type: 'string',
              description: 'User email',
              example: 'user@example.com',
            },
            name: {
              type: 'string',
              nullable: true,
              description: 'User name',
              example: 'John Doe',
            },
            isAdmin: {
              type: 'boolean',
              description: 'Whether the user is an admin',
              example: false,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
        ChatSession: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Session ID',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            userId: {
              type: 'string',
              description: 'User ID',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
        Message: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Message ID',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            sessionId: {
              type: 'string',
              description: 'Session ID',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            role: {
              type: 'string',
              description: 'Message role (user, assistant, system, tool)',
              example: 'user',
            },
            content: {
              type: 'string',
              description: 'Message content',
              example: 'What hotels are available in Bali?',
            },
            toolCalls: {
              type: 'object',
              nullable: true,
              description: 'Tool calls data if applicable',
            },
            toolCallId: {
              type: 'string',
              nullable: true,
              description: 'Tool call ID for responses',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
          },
        },
        IpWhitelist: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Whitelist entry ID',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            ipAddress: {
              type: 'string',
              description: 'IP address',
              example: '192.168.1.1',
            },
            description: {
              type: 'string',
              nullable: true,
              description: 'Description of the IP',
              example: 'Office network',
            },
            active: {
              type: 'boolean',
              description: 'Whether the IP is active',
              example: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
              example: 'An error occurred',
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'], // Path to the API docs
};

export const specs = swaggerJsdoc(options);