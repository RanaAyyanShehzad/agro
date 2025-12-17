import React, { useState, useEffect, useRef } from "react";
import Navbar from "../components/Navbar";
import {
  motion,
  useScroll,
  useTransform,
  useAnimation,
  useInView,
} from "framer-motion";
import {
  FaEnvelope,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaLeaf,
  FaFacebookF,
  FaTwitter,
  FaInstagram,
  FaLinkedinIn,
} from "react-icons/fa";
import HeroImage from "../assets/images/hero.jpg";
import AboutImage from "../assets/images/about.jpg";
import VisionImage from "../assets/images/vision.jpg";
import MissionImage from "../assets/images/mission.jpg";
import AuthModal from "../components/AuthModal";

const LandingPage = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { scrollY } = useScroll();
  const heroRef = useRef(null);

  // Listen for custom event to open auth modal
  useEffect(() => {
    const handleOpenAuth = (event) => {
      setIsAuthModalOpen(true);
    };
    window.addEventListener("openAuthModal", handleOpenAuth);
    return () => {
      window.removeEventListener("openAuthModal", handleOpenAuth);
    };
  }, []);

  // Parallax effect for hero image
  const heroImageY = useTransform(scrollY, [0, 500], [0, 150]);
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0]);

  // Animated counter for stats
  const [count, setCount] = useState({ farmers: 0, buyers: 0, products: 0 });
  const statsRef = useRef(null);
  const isStatsInView = useInView(statsRef, { once: true, amount: 0.3 });
  const statsControls = useAnimation();

  useEffect(() => {
    if (isStatsInView) {
      statsControls.start("visible");

      // Animate counters
      const interval = setInterval(() => {
        setCount((prev) => ({
          farmers: prev.farmers < 5000 ? prev.farmers + 50 : 5000,
          buyers: prev.buyers < 3500 ? prev.buyers + 35 : 3500,
          products: prev.products < 10000 ? prev.products + 100 : 10000,
        }));
      }, 20);

      return () => clearInterval(interval);
    }
  }, [isStatsInView, statsControls]);

  // Text animation variants
  const letterVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.05,
        duration: 0.5,
      },
    }),
  };

  // Animated section entry
  const sectionVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };
  const sectionReveal = {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.7, ease: "easeOut" },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: "easeOut" },
    },
  };

  // Floating animation for elements
  const floatingAnimation = {
    y: ["-5px", "5px", "-5px"],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut",
    },
  };

  // Split text into animated letters
  const AnimatedText = ({ text, className }) => {
    return (
      <motion.span
        className={className}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.5 }}
      >
        {text.split("").map((char, index) => (
          <motion.span
            key={index}
            custom={index}
            variants={letterVariants}
            style={{ display: "inline-block" }}
          >
            {char === " " ? "\u00A0" : char}
          </motion.span>
        ))}
      </motion.span>
    );
  };

  // Shimmer animation for headings
  const shimmerVariants = {
    initial: {
      backgroundPosition: "-500px 0",
    },
    animate: {
      backgroundPosition: "500px 0",
      transition: {
        repeat: Infinity,
        duration: 3,
        ease: "linear",
      },
    },
  };

  return (
    <div className="bg-gradient-to-b from-green-50 via-white to-green-50 overflow-hidden">
      {/* Navbar */}
      <Navbar />

      {/* Hero Section */}
      <section ref={heroRef} id="home" className="relative h-screen">
        <motion.div style={{ y: heroImageY }} className="absolute inset-0">
          <img
            src={HeroImage}
            alt="Hero"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />
        </motion.div>

        <motion.div
          className="absolute inset-0 flex flex-col justify-center items-center text-center text-white z-10"
          style={{ opacity: heroOpacity }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
            className="relative"
          >
            <motion.span
              className="absolute -left-10 -top-10"
              animate={floatingAnimation}
            >
              <FaLeaf className="text-green-400 text-4xl opacity-70" />
            </motion.span>

            <motion.h1
              className="text-7xl font-bold mb-6"
              variants={shimmerVariants}
              initial="initial"
              animate="animate"
              style={{
                textShadow: "0 0 20px rgba(255,255,255,0.3)",
                background:
                  "linear-gradient(90deg, transparent, #ffffff, transparent)",
                backgroundSize: "1000px 100%",
                WebkitBackgroundClip: "text",
                position: "relative",
              }}
            >
              Welcome to FarmConnect
            </motion.h1>

            <motion.span
              className="absolute -right-10 -bottom-2"
              animate={{
                ...floatingAnimation,
                rotate: [0, 10, 0],
              }}
            >
              <FaLeaf className="text-green-400 text-3xl opacity-70" />
            </motion.span>
          </motion.div>

          <motion.p
            className="text-2xl max-w-2xl mb-8 leading-relaxed"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            Revolutionizing Agriculture by Connecting Farmers, Buyers &
            Suppliers
            <motion.span
              className="block text-green-300 font-semibold mt-3"
              animate={{
                opacity: [0.7, 1, 0.7],
                textShadow: [
                  "0 0 5px rgba(134, 239, 172, 0.3)",
                  "0 0 20px rgba(134, 239, 172, 0.6)",
                  "0 0 5px rgba(134, 239, 172, 0.3)",
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Growing Together. Thriving Together.
            </motion.span>
          </motion.p>

          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            <button
              className="relative overflow-hidden bg-gradient-to-r from-green-500 to-green-700 text-white py-4 px-10 rounded-full text-xl font-semibold shadow-lg group"
              onClick={() => setIsAuthModalOpen(true)}
            >
              <span className="relative z-10">Get Started</span>
              <motion.span
                className="absolute inset-0 bg-white"
                initial={{ x: "-100%", opacity: 0.2 }}
                whileHover={{ x: "100%" }}
                transition={{ duration: 0.5 }}
              />
            </button>
          </motion.div>
        </motion.div>

        {/* Animated scroll indicator */}
        <motion.div
          className="absolute bottom-10 left-1/2 transform -translate-x-1/2"
          animate={{
            y: [0, 10, 0],
            opacity: [0.3, 1, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <div className="w-8 h-12 border-2 border-white rounded-full flex justify-center">
            <motion.div
              className="w-2 h-2 rounded-full bg-white mt-2"
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </motion.div>

        {/* Authentication Modal */}
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
        />
      </section>

      {/* Stats Section */}
      <section
        ref={statsRef}
        className="py-16 bg-gradient-to-r from-green-700 to-green-800 text-white relative overflow-hidden"
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute left-1/4 top-10 w-40 h-40 rounded-full border border-white" />
          <div className="absolute right-1/5 bottom-10 w-60 h-60 rounded-full border border-white" />
          <div className="absolute left-1/3 bottom-10 w-20 h-20 rounded-full border border-white" />
        </div>

        <motion.div
          className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8"
          variants={sectionVariants}
          initial="hidden"
          animate={statsControls}
          viewport={{ once: true, amount: 0.3 }}
        >
          <motion.div className="text-center" variants={itemVariants}>
            <motion.div
              className="text-5xl font-bold mb-2"
              animate={floatingAnimation}
            >
              {count.farmers.toLocaleString()}+
            </motion.div>
            <div className="text-xl opacity-90">Farmers Connected</div>
          </motion.div>

          <motion.div className="text-center" variants={itemVariants}>
            <motion.div
              className="text-5xl font-bold mb-2"
              animate={floatingAnimation}
            >
              {count.buyers.toLocaleString()}+
            </motion.div>
            <div className="text-xl opacity-90">Active Buyers</div>
          </motion.div>

          <motion.div className="text-center" variants={itemVariants}>
            <motion.div
              className="text-5xl font-bold mb-2"
              animate={floatingAnimation}
            >
              {count.products.toLocaleString()}+
            </motion.div>
            <div className="text-xl opacity-90">Products Listed</div>
          </motion.div>
        </motion.div>
      </section>

      {/* About Section */}
      <motion.section
        id="about"
        className="py-28 text-center bg-white relative overflow-hidden"
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
      >
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-green-100 rounded-full opacity-50" />
        <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-green-100 rounded-full opacity-50" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 border border-green-200 rounded-full opacity-20" />

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8 }}
          className="relative z-10"
        >
          <motion.div
            variants={shimmerVariants}
            initial="initial"
            animate="animate"
            className="inline-block mb-2 px-6 py-1 rounded-full bg-green-100 text-green-700 font-medium"
            style={{
              backgroundImage:
                "linear-gradient(90deg, transparent, rgba(134, 239, 172, 0.5), transparent)",
              backgroundSize: "1000px 100%",
            }}
          >
            About Us
          </motion.div>

          <h2 className="text-5xl font-bold mb-12 relative inline-block">
            <span className="relative z-10 bg-clip-text text-transparent bg-gradient-to-r from-green-700 to-green-500">
              About FarmConnect
            </span>
            <motion.div
              className="absolute -bottom-2 left-0 right-0 h-3 bg-green-200 rounded-full z-0"
              initial={{ width: 0 }}
              whileInView={{ width: "100%" }}
              viewport={{ once: true, amount: 0.8 }}
              transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            />
          </h2>
        </motion.div>

        <div className="flex flex-col md:flex-row items-center justify-center max-w-6xl mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, x: -100, rotate: -5 }}
            whileInView={{ opacity: 1, x: 0, rotate: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="absolute inset-0 border-2 border-green-300 rounded-2xl transform translate-x-4 translate-y-4" />
            <img
              src={AboutImage}
              alt="About"
              className="w-full md:w-96 h-96 object-cover rounded-2xl shadow-2xl relative z-10"
            />
          </motion.div>

          <motion.div
            className="text-lg text-gray-700 p-8 leading-relaxed md:max-w-xl md:text-left space-y-4"
            initial={{ opacity: 0, x: 100 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              FarmConnect is a revolutionary digital platform designed to bridge
              the gap between farmers, buyers, and suppliers.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Our mission is to create a seamless and transparent agricultural
              marketplace where all stakeholders can trade efficiently without
              the interference of middlemen.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              By leveraging technology, we empower farmers to sell their
              products at fair prices, buyers to access fresh and high-quality
              produce, and suppliers to provide essential farming materials with
              ease.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="pt-4"
            >
              <button className="bg-green-600 text-white py-3 px-8 rounded-full hover:bg-green-700 transition duration-300 flex items-center group">
                <span>Learn More</span>
                <motion.span
                  className="ml-2"
                  initial={{ x: 0 }}
                  whileHover={{ x: 5 }}
                  transition={{ duration: 0.3 }}
                >
                  →
                </motion.span>
              </button>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* Our Vision & Our Mission Section */}
      <section className="py-28 px-4 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-6xl mx-auto">
          {/* Our Vision */}
          <motion.div
            className="flex flex-col md:flex-row items-center mb-32"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.3,
                },
              },
            }}
          >
            <motion.div
              variants={{
                hidden: { opacity: 0, x: -50 },
                visible: { opacity: 1, x: 0, transition: { duration: 0.8 } },
              }}
              className="relative"
            >
              <motion.div
                className="absolute -top-6 -left-6 w-24 h-24 bg-green-100 rounded-full"
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{ duration: 4, repeat: Infinity }}
              />
              <img
                src={VisionImage}
                alt="Our Vision"
                className="w-full md:w-96 h-96 object-cover rounded-2xl shadow-2xl md:mr-8 relative z-10"
              />
            </motion.div>

            <motion.div
              className="text-center md:text-left mt-8 md:mt-0 md:ml-8"
              variants={{
                hidden: { opacity: 0, x: 50 },
                visible: { opacity: 1, x: 0, transition: { duration: 0.8 } },
              }}
            >
              <motion.div
                variants={shimmerVariants}
                initial="initial"
                animate="animate"
                className="inline-block mb-2 px-6 py-1 rounded-full bg-green-100 text-green-700 font-medium"
                style={{
                  backgroundImage:
                    "linear-gradient(90deg, transparent, rgba(134, 239, 172, 0.5), transparent)",
                  backgroundSize: "1000px 100%",
                }}
              >
                Our Vision
              </motion.div>

              <h3 className="text-4xl font-bold mb-6 relative inline-block">
                <AnimatedText
                  text="Connecting Tomorrow's Agriculture"
                  className="bg-clip-text text-transparent bg-gradient-to-r from-green-700 to-green-500"
                />
              </h3>

              <div className="space-y-4">
                <motion.p
                  className="text-lg text-gray-700 leading-relaxed"
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.5 },
                    },
                  }}
                >
                  We envision a future where farmers, buyers, and suppliers
                  seamlessly connect through technology, ensuring transparency,
                  fair pricing, and sustainable agricultural practices.
                </motion.p>

                <motion.p
                  className="text-lg text-gray-700 leading-relaxed"
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.5, delay: 0.2 },
                    },
                  }}
                >
                  By empowering small-scale farmers with direct market access,
                  we aim to foster economic growth and environmental
                  responsibility.
                </motion.p>
              </div>
            </motion.div>
          </motion.div>

          {/* Our Mission */}
          <motion.div
            className="flex flex-col md:flex-row-reverse items-center"
            id="services"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.3,
                },
              },
            }}
          >
            <motion.div
              variants={{
                hidden: { opacity: 0, x: 50 },
                visible: { opacity: 1, x: 0, transition: { duration: 0.8 } },
              }}
              className="relative"
            >
              <motion.div
                className="absolute -bottom-6 -right-6 w-24 h-24 bg-green-100 rounded-full"
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{ duration: 4, repeat: Infinity }}
              />
              <img
                src={MissionImage}
                alt="Our Mission"
                className="w-full md:w-96 h-96 object-cover rounded-2xl shadow-2xl md:ml-8 relative z-10"
              />
            </motion.div>

            <motion.div
              className="text-center md:text-left mt-8 md:mt-0 md:mr-8"
              variants={{
                hidden: { opacity: 0, x: -50 },
                visible: { opacity: 1, x: 0, transition: { duration: 0.8 } },
              }}
            >
              <motion.div
                variants={shimmerVariants}
                initial="initial"
                animate="animate"
                className="inline-block mb-2 px-6 py-1 rounded-full bg-green-100 text-green-700 font-medium"
                style={{
                  backgroundImage:
                    "linear-gradient(90deg, transparent, rgba(134, 239, 172, 0.5), transparent)",
                  backgroundSize: "1000px 100%",
                }}
              >
                Our Mission
              </motion.div>

              <h3 className="text-4xl font-bold mb-6 relative inline-block">
                <AnimatedText
                  text="Revolutionizing Agriculture"
                  className="bg-clip-text text-transparent bg-gradient-to-r from-green-700 to-green-500"
                />
              </h3>

              <div className="space-y-4">
                <motion.p
                  className="text-lg text-gray-700 leading-relaxed"
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.5 },
                    },
                  }}
                >
                  Our mission is to create an efficient, transparent, and fair
                  agricultural trading system by leveraging cutting-edge
                  technology.
                </motion.p>

                <motion.p
                  className="text-lg text-gray-700 leading-relaxed"
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.5, delay: 0.2 },
                    },
                  }}
                >
                  We strive to reduce exploitation in the farming industry by
                  eliminating middlemen and ensuring direct communication
                  between farmers, buyers, and suppliers.
                </motion.p>

                <motion.p
                  className="text-lg text-gray-700 leading-relaxed"
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.5, delay: 0.4 },
                    },
                  }}
                >
                  FarmConnect provides a comprehensive platform with order
                  management, dispute resolution, and secure payment processing.
                  By offering a reliable digital marketplace, we help all
                  agricultural stakeholders conduct business efficiently and
                  achieve long-term sustainability.
                </motion.p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-28 bg-green-50 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-40 h-40 border border-green-500 rounded-full" />
          <div className="absolute bottom-1/4 right-1/4 w-60 h-60 border border-green-500 rounded-full" />
          <div className="absolute top-3/4 left-1/2 w-20 h-20 border border-green-500 rounded-full" />
        </div>

        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <motion.div
              variants={shimmerVariants}
              initial="initial"
              animate="animate"
              className="inline-block mb-2 px-6 py-1 rounded-full bg-green-100 text-green-700 font-medium"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, transparent, rgba(134, 239, 172, 0.5), transparent)",
                backgroundSize: "1000px 100%",
              }}
            >
              Our Features
            </motion.div>

            <h2 className="text-5xl font-bold mb-6 relative inline-block">
              <span className="relative z-10 bg-clip-text text-transparent bg-gradient-to-r from-green-700 to-green-500">
                Why Choose FarmConnect
              </span>
              <motion.div
                className="absolute -bottom-2 left-0 right-0 h-3 bg-green-200 rounded-full z-0"
                initial={{ width: 0 }}
                whileInView={{ width: "100%" }}
                viewport={{ once: true, amount: 0.8 }}
                transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
              />
            </h2>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            {[
              {
                icon: "🌱",
                title: "Direct Marketplace",
                description:
                  "Connect directly with buyers and suppliers without intermediaries",
              },
              {
                icon: "📱",
                title: "Real-Time Notifications",
                description:
                  "Stay updated with instant notifications for orders, disputes, and important updates",
              },
              {
                icon: "🔒",
                title: "Secure Transactions",
                description:
                  "Safe and transparent payment system for all parties",
              },
              {
                icon: "⚖️",
                title: "Dispute Resolution",
                description:
                  "Fair and transparent dispute management system with admin oversight for buyer-seller conflicts",
              },
              {
                icon: "📊",
                title: "Order Management",
                description:
                  "Comprehensive order tracking and management system for seamless transactions",
              },
              {
                icon: "⭐",
                title: "Product Reviews & Ratings",
                description:
                  "Authentic buyer reviews and ratings to help make informed purchasing decisions",
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition duration-300 relative overflow-hidden group"
                variants={itemVariants}
                whileHover={{ y: -10 }}
              >
                <motion.div
                  className="absolute -right-10 -bottom-10 w-40 h-40 bg-green-100 rounded-full opacity-0 group-hover:opacity-30"
                  transition={{ duration: 0.3 }}
                />

                <motion.div
                  className="text-4xl mb-4"
                  animate={floatingAnimation}
                >
                  {feature.icon}
                </motion.div>

                <h3 className="text-2xl font-bold text-green-700 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.description}</p>

                <motion.div
                  className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-green-400 to-green-600"
                  initial={{ width: 0 }}
                  whileInView={{ width: "100%" }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.2 * index }}
                />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Get in Touch (Our Contact) Section */}
      {/* Get in Touch (Our Contact) Section */}
      <section
        id="contact"
        className="py-28 bg-white text-center relative overflow-hidden"
      >
        <div className="absolute inset-0 opacity-10">
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <pattern
              id="grid"
              width="8"
              height="8"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 8 0 L 0 0 0 8"
                fill="none"
                stroke="rgba(34, 197, 94, 0.1)"
                strokeWidth="0.5"
              />
            </pattern>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          className="max-w-6xl mx-auto px-4"
        >
          <motion.div
            variants={shimmerVariants}
            initial="initial"
            animate="animate"
            className="inline-block mb-2 px-6 py-1 rounded-full bg-green-100 text-green-700 font-medium"
            style={{
              backgroundImage:
                "linear-gradient(90deg, transparent, rgba(134, 239, 172, 0.5), transparent)",
              backgroundSize: "1000px 100%",
            }}
          >
            Contact Us
          </motion.div>

          <h2 className="text-5xl font-bold mb-6">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-700 to-green-500">
              Get in Touch
            </span>
          </h2>
          <p className="text-xl text-gray-600 mb-16 max-w-2xl mx-auto">
            Have questions or want to learn more? Reach out to us - we're here
            to help you grow!
          </p>

          <div className="flex flex-col md:flex-row justify-center items-center gap-16 text-center transition-all duration-500">
            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="space-y-8 max-w-md"
            >
              {[
                {
                  icon: <FaMapMarkerAlt className="text-green-600 text-xl" />,
                  title: "Our Office",
                  lines: ["123 Farm Road", "Agricultural City, AC 12345"],
                },
                {
                  icon: <FaPhoneAlt className="text-green-600 text-xl" />,
                  title: "Phone Number",
                  lines: ["+1 (234) 567-8900", "+1 (987) 654-3210"],
                },
                {
                  icon: <FaEnvelope className="text-green-600 text-xl" />,
                  title: "Email Address",
                  lines: ["info@farmconnect.com", "support@farmconnect.com"],
                },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-4 text-left">
                  <motion.div
                    className="p-3 bg-green-100 rounded-lg"
                    whileHover={{ scale: 1.1 }}
                  >
                    {item.icon}
                  </motion.div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                    <p className="text-gray-600">{item.lines.join("\n")}</p>
                  </div>
                </div>
              ))}

              {/* Social Media */}
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="flex gap-6 mt-12 justify-center items-center"
              >
                {[
                  { icon: <FaFacebookF />, color: "#1877F2" },
                  { icon: <FaTwitter />, color: "#1DA1F2" },
                  { icon: <FaInstagram />, color: "#E4405F" },
                  { icon: <FaLinkedinIn />, color: "#0A66C2" },
                ].map((social, index) => (
                  <motion.a
                    key={index}
                    href="#"
                    className="text-2xl p-3 rounded-full hover:text-white transition-colors"
                    style={{ color: social.color }}
                    whileHover={{
                      scale: 1.1,
                      backgroundColor: social.color,
                    }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {social.icon}
                  </motion.a>
                ))}
              </motion.div>
            </motion.div>

            {/* Contact Form */}
            <motion.form
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="space-y-6 max-w-md w-full"
            >
              {/* Example form fields — uncomment and customize */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <input
                  type="text"
                  placeholder="Your Name"
                  className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
              >
                <input
                  type="email"
                  placeholder="Your Email"
                  className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                <textarea
                  placeholder="Your Message"
                  rows="5"
                  className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                ></textarea>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
              >
                <button
                  type="submit"
                  className="w-full bg-green-600 text-white py-4 px-8 rounded-lg text-lg font-semibold hover:bg-green-700 transition-colors"
                >
                  Send Message
                </button>
              </motion.div>
            </motion.form>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="bg-green-900 text-white py-12 relative">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="flex flex-col md:flex-row justify-between items-center mb-8"
          >
            <div className="text-3xl font-bold mb-4 md:mb-0">FarmConnect</div>
            <div className="flex gap-6 mb-4 md:mb-0">
              <a
                href="#about"
                className="hover:text-green-300 transition-colors"
              >
                About
              </a>
              <a
                href="#services"
                className="hover:text-green-300 transition-colors"
              >
                Services
              </a>
              <a
                href="#contact"
                className="hover:text-green-300 transition-colors"
              >
                Contact
              </a>
            </div>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-gray-300 text-sm"
          >
            © 2024 FarmConnect. All rights reserved. | Designed with ❤️ by
            FarmConnect
          </motion.p>
        </div>
      </footer>
    </div>
  );
};
export default LandingPage;
