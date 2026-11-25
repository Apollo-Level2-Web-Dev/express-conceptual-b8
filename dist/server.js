
      import { createRequire } from 'module';
      const require = createRequire(import.meta.url);
    

// src/app.ts
import express from "express";
import cors from "cors";

// src/modules/auth/auth.routes.ts
import { Router } from "express";

// src/config/db.ts
import pg from "pg";

// src/config/index.ts
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(process.cwd(), ".env") });
var config = {
  port: process.env.PORT,
  nodeEnv: process.env.NODE_ENV,
  connection_string: process.env.DATABASE_URL,
  jwt_secret: process.env.JWT_SECRET
};
var config_default = config;

// src/config/db.ts
var { Pool } = pg;
var pool = new Pool({
  connectionString: config_default.connection_string
});

// src/utils/jwtHelpers.ts
import jwt from "jsonwebtoken";
var generateToken = (payload) => {
  return jwt.sign(payload, config_default.jwt_secret, {
    expiresIn: "1d"
  });
};
var verifyToken = (token) => {
  return jwt.verify(token, config_default.jwt_secret);
};
var jwtHelpers = { generateToken, verifyToken };

// src/utils/passwordHelpers.ts
import bcrypt from "bcryptjs";
var hashPassword = async (plainPassword) => {
  return await bcrypt.hash(plainPassword, 10);
};
var compareHash = async (plainPassword, hashPassword2) => {
  return await bcrypt.compare(plainPassword, hashPassword2);
};
var passwordHelpers = {
  hashPassword,
  compareHash
};

// src/modules/auth/auth.service.ts
var register = async (payload) => {
  const { name, email, role, password } = payload;
  const hashedPassword = passwordHelpers.hashPassword(password);
  const result = await pool.query(
    `INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role`,
    [name, email, hashedPassword, role]
  );
  return result.rows[0];
};
var login = async (email, password) => {
  const isUserExists = await pool.query(
    "SELECT * FROM users WHERE email = $1",
    [email]
  );
  const user = isUserExists.rows[0];
  if (!user || !passwordHelpers.compareHash(password, user.password)) {
    const error = new Error("Invalid Email or Password");
    throw error;
  }
  const token = jwtHelpers.generateToken({
    id: user.id,
    email: user.email,
    role: user.role
  });
  return { user, token };
};
var authService = {
  register,
  login
};

// src/modules/auth/auth.controller.ts
var register2 = async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    res.send({
      message: "User Registered Successfully",
      data: result
    });
  } catch (error) {
    res.send({
      message: error instanceof Error ? error.message : "Something went wrong",
      data: error
    });
  }
};
var login2 = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { user, token } = await authService.login(email, password);
    res.send({
      message: "User Logged in Successfully",
      data: {
        user,
        token
      }
    });
  } catch (error) {
    res.send({
      message: error instanceof Error ? error.message : "Something went wrong",
      data: error
    });
  }
};
var authController = { register: register2, login: login2 };

// src/modules/auth/auth.routes.ts
var authRouter = Router();
authRouter.post("/register", authController.register);
authRouter.post("/login", authController.login);
var auth_routes_default = authRouter;

// src/modules/books/book.routes.ts
import { Router as Router2 } from "express";

// src/modules/books/book.service.ts
var createBook = async (payload) => {
  const { title, description, author, isbn, total_copies, available_copies } = payload;
  const result = await pool.query(
    `INSERT INTO books (title, description, author, isbn, total_copies, available_copies) VALUES($1, $2, $3, $4, $5, $6) RETURNING *`,
    [title, description, author, isbn, total_copies, available_copies]
  );
  return result.rows[0];
};
var getBooks = async (search) => {
  let sql = `SELECT * FROM books`;
  let params = [];
  if (search) {
    sql = `SELECT * FROM books WHERE title ILIKE $1 OR description ILIKE $1`;
    params = [`%${search}%`];
  }
  const result = await pool.query(sql, params);
  return result.rows;
};
var updateBook = async (id, payload) => {
  const { title, description, author, isbn, total_copies, available_copies } = payload;
  const result = await pool.query(
    `UPDATE books
                                        SET title = COALESCE($1, title), 
                                            description = COALESCE($2, description),
                                            author = COALESCE($3, author),
                                            isbn = COALESCE($4, isbn),
                                            total_copies = COALESCE($5, total_copies),
                                            available_copies = COALESCE($6, available_copies)
                                            WHERE id = $7 RETURNING *`,
    [
      title ?? null,
      description ?? null,
      author ?? null,
      isbn ?? null,
      total_copies ?? null,
      available_copies ?? null,
      id
    ]
  );
  return result.rows[0];
};
var deleteBook = async (id) => {
  const result = await pool.query(`DELETE FROM books WHERE id = $1`, [id]);
  return result.rows;
};
var bookService = {
  createBook,
  getBooks,
  updateBook,
  deleteBook
};

// src/modules/books/book.controller.ts
var createBook2 = async (req, res, next) => {
  try {
    const result = await bookService.createBook(req.body);
    res.send({
      message: "Book created successfully",
      data: result
    });
  } catch (error) {
    next(error);
  }
};
var getBooks2 = async (req, res) => {
  try {
    const result = await bookService.getBooks(req.query.search);
    res.send({
      message: "Book retrieved successfully",
      data: result
    });
  } catch (error) {
    res.send({
      message: error instanceof Error ? error.message : "Something went wrong",
      data: error
    });
  }
};
var updateBook2 = async (req, res) => {
  try {
    const id = req.params.id;
    const result = await bookService.updateBook(id, req.body);
    res.send({
      message: "Book updated successfully",
      data: result
    });
  } catch (error) {
    res.send({
      message: error instanceof Error ? error.message : "Something went wrong",
      data: error
    });
  }
};
var deleteBook2 = async (req, res) => {
  try {
    const id = req.params.id;
    const result = await bookService.deleteBook(id);
    res.send({
      message: "Book deleted successfully",
      data: result
    });
  } catch (error) {
    res.send({
      message: error instanceof Error ? error.message : "Something went wrong",
      data: error
    });
  }
};
var bookController = { createBook: createBook2, getBooks: getBooks2, updateBook: updateBook2, deleteBook: deleteBook2 };

// src/middlewares/auth.middleware.ts
var verifyToken2 = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    throw new Error("Access Denied! Token not found!");
  }
  try {
    const decoded = jwtHelpers.verifyToken(authHeader);
    console.log({ decoded });
    req.user = decoded;
    next();
  } catch {
    throw new Error("Invalid or expired token.");
  }
};
var authorizedRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      const error = new Error("Forbidden: You don't have access!");
      error.statusCode = 403;
      throw error;
    }
    next();
  };
};
var authMiddleware = { verifyToken: verifyToken2, authorizedRoles };

// src/modules/books/book.routes.ts
var bookRouter = Router2();
bookRouter.post("/", bookController.createBook);
bookRouter.get(
  "/",
  authMiddleware.verifyToken,
  authMiddleware.authorizedRoles("member"),
  bookController.getBooks
);
bookRouter.patch("/:id", bookController.updateBook);
bookRouter.delete("/:id", bookController.deleteBook);
var book_routes_default = bookRouter;

// src/middlewares/globalErrorHandler.ts
var globalErrorHandler = (err, req, res, next) => {
  console.log({ err });
  let statusCode = err.statusCode ?? 500;
  let message = err.message || "Internal Server Error";
  let errDetails = err;
  if (err.code === "23505") {
    message = "please change your ISBN number";
  }
  res.status(statusCode).send({
    message,
    error: errDetails
  });
};
var globalErrorHandler_default = globalErrorHandler;

// src/app.ts
var app = express();
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.get("/", (req, res) => {
  res.send({ message: "Hello World!" });
});
app.use("/api/auth", auth_routes_default);
app.use("/api/book", book_routes_default);
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
});
app.use(globalErrorHandler_default);
var app_default = app;

// src/config/initDb.ts
var createTableQuery = `
    CREATE TABLE IF NOT EXISTS users(
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(25) CHECK (role IN ('admin', 'member')) DEFAULT  'member'
    );

    CREATE TABLE IF NOT EXISTS books(
        id SERIAL PRIMARY KEY, 
        title VARCHAR(100) NOT NULL, 
        description VARCHAR(255) NOT NULL,
        author VARCHAR(150) NOT NULL, 
        isbn  VARCHAR(50) UNIQUE NOT NULL, 
        total_copies INT NOT NULL CHECK (total_copies >= 0), 
        available_copies  INT NOT NULL CHECK (available_copies >= 0),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`;
var initDatabase = async () => {
  await pool.query(createTableQuery);
  console.log("Database table created");
};

// src/server.ts
var startServer = async () => {
  try {
    const time = await pool.query("SELECT NOW()");
    console.log("Database connected successfully on: ", time.rows[0].now);
    initDatabase();
    app_default.listen(config_default.port, () => {
      console.log(`Server Listening on PORT: ${config_default.port}`);
    });
  } catch (error) {
    console.error("Failed to connect server", error);
  }
};
startServer();
//# sourceMappingURL=server.js.map