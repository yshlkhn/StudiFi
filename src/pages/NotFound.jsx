import React from "react";
import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="notfound-container flex h-screen flex-col items-center justify-center bg-white text-black">
      <h1 className="notfound-title m-0 text-[80px] font-bold">404</h1>

      <h2 className="notfound-subtitle my-2 text-3xl font-semibold">
        Page Not Found
      </h2>

      <p className="notfound-text mb-5 text-base">
        The page you are looking for does not exist.
      </p>

      <Link
        to="/"
        className="notfound-btn rounded-[10px] border-2 border-black bg-white px-5 py-2.5 font-semibold text-black transition-all duration-300 hover:bg-black hover:text-white"
      >
        Go Back Home
      </Link>
    </div>
  );
};

export default NotFound;