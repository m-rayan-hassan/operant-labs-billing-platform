# Billing Platform Module Handoff & Setup Guide

## Overview
This is the Operant Labs Billing Platform module. It consists of a Node.js/Express backend (using Drizzle ORM) and a Next.js/React frontend.

## Prerequisites
- Node.js (v18 or higher recommended)
- PostgreSQL database (Neon DB or local instance)
- npm or yarn package manager

## Setup Instructions

### 1. Repository Setup
First, clone the Billing Platform repository to your local machine and navigate into the root of the repository:


### 2. Database Setup
Ensure you have a running PostgreSQL instance (or create a project on Neon DB). Create a new database for the Billing Platform module and keep the connection string (Database URL) handy.

### 3. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Environment Configuration:
   Copy the `.env.example` to `.env`.
   ```bash
   cp .env.example .env
   ```
   Open the `.env` file and strictly update the required variables:
   - `DATABASE_URL`: Your PostgreSQL connection string.
   - Stripe API keys, JWT secrets, Port settings, etc.
4. Database Schema Push:
   Push the Drizzle ORM schema to your database to create the necessary tables. This will automatically sync your database with the schema definitions.
   ```bash
   npm run db:push
   ```
5. Start the backend development server:
   ```bash
   npm run dev
   ```
   The backend API will typically start on `http://localhost:5000` (or whatever is defined in the `.env` file).

### 4. Frontend Setup
1. Open a new terminal window and navigate to the frontend directory from the project root:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Environment Configuration:
   Copy the `.env.example` to `.env.local`.
   ```bash
   cp .env.example .env.local
   ```
   Ensure the frontend environment variables (like `NEXT_PUBLIC_API_URL`) correctly point to your running backend (e.g., `http://localhost:5000/api`).
4. Start the frontend development server:
   ```bash
   npm run dev
   ```
   The frontend will be accessible at `http://localhost:3000`.

## Running the Application
Once the backend and frontend are running and configured, you can use the Billing Platform application normally via your browser (typically http://localhost:3000).
