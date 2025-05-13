import express from "express";
import { isAuthenticated } from "../middlewares/auth.js";
import { addProduct, deleteProduct, getAllProducts, getAllProductsForFarmer, getMyProduct, updateProduct } from "../controllers/products.js";

const router=express.Router();

router.post("/add",isAuthenticated,addProduct);
router.get("/all",isAuthenticated,getAllProducts);
router.get("/productForFarmer",isAuthenticated,getAllProductsForFarmer);
router.get("/my_product",isAuthenticated,getMyProduct);
router.delete("/delete/:id", isAuthenticated, deleteProduct);
router.put("/update/:id", isAuthenticated, updateProduct);
export default router;