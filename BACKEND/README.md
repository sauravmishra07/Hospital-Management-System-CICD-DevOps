# Hospital Backend

A Node.js backend application for managing hospital operations, including user authentication, appointment scheduling, and messaging services.

## Features

- User registration and authentication with JWT
- Appointment booking and management
- Messaging system for communication
- File upload support via Cloudinary
- Secure cookie-based sessions
- CORS enabled for frontend and dashboard integration

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JSON Web Tokens (JWT)
- **File Storage**: Cloudinary
- **Other Libraries**: bcrypt for password hashing, validator for input validation, cookie-parser, cors, express-fileupload

## Installation

1. Clone the repository:

   ```
   git clone <repository-url>
   cd hospital-backend
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Set up environment variables:
   - Copy `config/config.env` to a new file (e.g., `.env`)
   - Update the values with your own configurations:
     - `PORT`: Server port (default: 4000)
     - `MONGO_URI`: MongoDB connection string
     - `FRONTEND_URL`: Frontend application URL
     - `DASHBOARD_URL`: Dashboard application URL
     - `JWT_SECRET_KEY`: Secret key for JWT signing
     - `JWT_EXPIRE`: JWT expiration time (e.g., 7d)
     - `COOKIE_EXPIRE`: Cookie expiration days
     - `CLOUDINARY_CLOUD_NAME`: Cloudinary cloud name
     - `CLOUDINARY_API_KEY`: Cloudinary API key
     - `CLOUDINARY_API_SECRET`: Cloudinary API secret

4. Start the development server:

   ```
   npm run dev
   ```

   Or start the production server:

   ```
   npm start
   ```

The server will run on the specified PORT (default: 4000).

## API Endpoints

- **User Management**: `/api/v1/user`
  - Registration, login, profile management

- **Appointments**: `/api/v1/appointment`
  - Book, view, update, cancel appointments

- **Messages**: `/api/v1/message`
  - Send and receive messages

## Project Structure

```
├── app.js                 # Main application setup
├── server.js              # Server entry point
├── config/
│   └── config.env         # Environment configuration
├── controller/            # Route controllers
├── database/
│   └── dbconnection.js    # Database connection
├── middlewares/           # Custom middlewares
├── models/                # Mongoose schemas
├── router/                # Route definitions
└── utils/                 # Utility functions
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

This project is licensed under the ISC License.
