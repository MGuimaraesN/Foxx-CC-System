# Foxx-CC-System Frontend

This is the React 19 frontend for the Foxx Credit Card Expense System.

## Installation

Due to the transition of the React ecosystem to version 19, some peer dependencies (like `recharts`) may strictly require React 18 in their metadata, even though they function correctly with React 19.

To install dependencies, please use the legacy peer dependency flag:

```bash
npm install --legacy-peer-deps
```

## Scripts

- `npm run dev`: Start the development server
- `npm run build`: Build for production
- `npm run preview`: Preview the production build

## Environment Variables

Create a `.env` file based on `.env.example`:

```
VITE_API_URL=http://localhost:3000
```
