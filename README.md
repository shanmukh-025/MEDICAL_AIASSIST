# MedAssist AI - Village Medicine Assistant

A comprehensive healthcare management application designed to provide medical assistance to rural communities. This full-stack application combines React frontend with a Node.js/Express backend to deliver health tracking, telemedicine, and AI-powered wellness features.

## Features

- **User Authentication**: Secure registration and login with JWT-based authentication
- **Health Tracking**: Monitor daily health metrics and maintain health records
- **Appointment Scheduling**: Book and manage appointments with healthcare providers
- **AI-Powered Wellness**: Get personalized wellness recommendations powered by AI
- **First Aid Guidance**: Quick access to first aid information
- **Health Scanning**: Medical image/document scanning capabilities
- **Multi-language Support**: Localized content for different regions
- **Doctor Directory**: Browse and connect with available healthcare providers
- **Health Records Management**: Securely store and retrieve medical records

## Project Structure

```
village-medicine-assistant/
├── src/                    # Frontend React application
│   ├── components/        # Reusable React components
│   ├── pages/            # Page components
│   ├── context/          # Context API for state management
│   ├── utils/            # Utility functions and API calls
│   └── assets/           # Static assets
├── server/               # Backend Node.js/Express server
│   ├── config/           # Database configuration
│   ├── models/           # MongoDB data models
│   ├── routes/           # API endpoints
│   ├── middleware/       # Authentication middleware
│   └── server.js         # Express server entry point
└── public/               # Static files and manifest
```

## Tech Stack

### Frontend
- **React 18** - UI library
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **JWT** - Authentication tokens

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- MongoDB instance (local or cloud)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/shanmukh-025/MedAssist_AI.git
cd village-medicine-assistant
```

2. Install frontend dependencies:
```bash
npm install
```

3. Install backend dependencies:
```bash
cd server
npm install
cd ..
```

### Configuration

1. Create a `.env` file in the `server` directory:
```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
PORT=5000
```

2. Update the frontend API configuration in `src/utils/api.js` if needed.

### Running the Application

1. Start the backend server:
```bash
cd server
npm start
```

2. In a new terminal, start the frontend development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - User login
- `GET /api/auth/user` - Get current user info

### Health Records
- `GET /api/health/records` - Retrieve user's health records
- `POST /api/health/records` - Create a new health record
- `PUT /api/health/records/:id` - Update health record

### Appointments
- `GET /api/appointments` - Get user's appointments
- `POST /api/appointments` - Schedule a new appointment
- `PUT /api/appointments/:id` - Update appointment

### Wellness
- `GET /api/wellness` - Get wellness recommendations
- `POST /api/wellness/log` - Log wellness data

### AI Features
- `POST /api/ai/analyze` - AI health analysis

## Development

### Available Scripts

```bash
# Frontend
npm run dev        # Start development server
npm run build      # Build for production
npm run preview    # Preview production build
npm run lint       # Run ESLint

# Backend
cd server
npm start          # Start the server in development mode
npm run build      # Build for production
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the MIT License.

## Support

For support or questions, please open an issue on the GitHub repository.

---

**Built with ❤️ for better healthcare access in rural communities**
