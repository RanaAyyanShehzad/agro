import React, { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

const Navbar = () => {
  const [navOpen, setNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [logoClickCount, setLogoClickCount] = useState(0);

  // Detect scroll position
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 w-full p-4 z-50 transition-all duration-500 ease-in-out shadow-lg ${
        scrolled ? "bg-green-400 py-2" : "bg-green-600 py-4"
      } text-white`}
    >
      <div className="container mx-auto flex justify-between items-center">
        {/* Logo with animation - Easter egg for admin login */}
        <h4
          className="text-3xl font-extrabold tracking-wide group cursor-pointer"
          onClick={() => {
            setLogoClickCount((prev) => {
              const newCount = prev + 1;
              if (newCount >= 5) {
                // Trigger admin login option
                const event = new CustomEvent("openAuthModal", {
                  detail: { showAdmin: true },
                });
                window.dispatchEvent(event);
                return 0; // Reset counter
              }
              return newCount;
            });
          }}
          title={
            logoClickCount > 0 ? `${5 - logoClickCount} more clicks...` : ""
          }
        >
          <span className="text-green-100 transition-all duration-300 group-hover:text-white">
            Farm
          </span>
          <span className="text-green-200 transition-all duration-300 group-hover:text-green-100">
            Connect
          </span>
        </h4>

        {/* Desktop Menu */}
        <nav className="hidden md:flex space-x-6 items-center">
          {["Home", "About", "Services", "Contact"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="relative font-semibold overflow-hidden group py-1"
            >
              <span className="transition-transform duration-300 inline-block group-hover:-translate-y-full">
                {item}
              </span>
              <span className="absolute left-0 translate-y-full transition-transform duration-300 group-hover:translate-y-0">
                {item}
              </span>
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
            </a>
          ))}
          <button
            onClick={() => {
              const event = new CustomEvent("openAuthModal");
              window.dispatchEvent(event);
            }}
            className="ml-4 px-6 py-2 bg-white text-green-600 rounded-full font-semibold hover:bg-green-50 transition-all duration-300 hover:scale-105 shadow-lg"
          >
            Login
          </button>
        </nav>

        {/* Mobile Menu Button with animation */}
        <button
          className="md:hidden p-2 bg-white text-green-600 rounded transition-all duration-300 hover:bg-green-50 active:scale-95"
          onClick={() => setNavOpen(!navOpen)}
        >
          {navOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu with slide animation */}
      <div
        className={`md:hidden bg-green-700 text-white overflow-hidden transition-all duration-500 ease-in-out ${
          navOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <nav className="flex flex-col space-y-3 p-4">
          {["Home", "About", "Services", "Contact"].map((item, index) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="hover:text-gray-300 transform transition-all duration-300 hover:translate-x-2"
              style={{
                transitionDelay: `${index * 50}ms`,
                opacity: navOpen ? 1 : 0,
                transform: navOpen ? "translateX(0)" : "translateX(-20px)",
              }}
            >
              {item}
            </a>
          ))}
          <button
            onClick={() => {
              setNavOpen(false);
              const event = new CustomEvent("openAuthModal");
              window.dispatchEvent(event);
            }}
            className="mt-2 px-6 py-2 bg-white text-green-600 rounded-full font-semibold hover:bg-green-50 transition-all duration-300 text-center"
            style={{
              opacity: navOpen ? 1 : 0,
              transform: navOpen ? "translateX(0)" : "translateX(-20px)",
            }}
          >
            Login
          </button>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
