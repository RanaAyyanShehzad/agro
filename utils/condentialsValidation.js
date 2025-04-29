import ErrorHandler from "../middlewares/error.js";
export const validation = async (next, Name, email, password, phone, address) => {
    if (!Name || Name.trim() === "") {
        next(new ErrorHandler("Name is required", 400));
        // Throw error to stop execution in the calling function
        throw new Error("Validation failed");
    }
    const nameRegex = /^[a-zA-Z\s-]+$/;
    if (!nameRegex.test(Name)) {
        next(new ErrorHandler("Name can only contain letters, spaces, and hyphens.", 400));
        throw new Error("Validation failed");
    }
    //Checking email pattern
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        next(new ErrorHandler("Please provide a valid email", 400));
        throw new Error("Validation failed");
    }
    //checking password length and validity
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
        next(new ErrorHandler("Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.", 400));
        throw new Error("Validation failed");
    }
    //checking phone number
    const phoneRegex = /^\+92\d{10}$/;
    if (!phoneRegex.test(phone)) {
        next(new ErrorHandler("Phone number must be in +92XXXXXXXXXX format", 400));
        throw new Error("Validation failed");
    }
    if (!address || address.trim() === "") {
        next(new ErrorHandler("Address is required", 400));
        throw new Error("Validation failed");
    }
    
    // If validation passes, return true or nothing
    return true;
}