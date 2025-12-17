import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import { useProductPreview } from "../hooks/useProductPreview.jsx";

const Wishlist = () => {
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { openPreview, ProductPreviewModal } = useProductPreview();
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" },
    },
  };
  useEffect(() => {
    fetchWishlist();
  }, []);

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        "https://agrofarm-vd8i.onrender.com/api/wishlist/my-wishlist",
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch wishlist");

      const data = await response.json();
      if (data.success && data.wishlist?.products) {
        setWishlistItems(data.wishlist.products);
      } else {
        setWishlistItems([]);
      }
    } catch (error) {
      toast.error("Failed to fetch wishlist");
      console.error("Error fetching wishlist:", error);
      setWishlistItems([]);
    } finally {
      setLoading(false);
    }
  };

  const removeItemFromWishlist = async (productId) => {
    try {
      const response = await fetch(
        `https://agrofarm-vd8i.onrender.com/api/wishlist/item/${productId}`,
        {
          method: "DELETE",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok) throw new Error("Failed to remove item");

      toast.success("Item removed from wishlist");
      fetchWishlist();
    } catch (error) {
      toast.error("Failed to remove item");
      console.error("Remove error:", error);
    }
  };

  const emptyWishlist = async () => {
    try {
      const response = await fetch(
        "https://agrofarm-vd8i.onrender.com/api/wishlist/clear",
        {
          method: "DELETE",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok) throw new Error("Failed to clear wishlist");

      toast.success("Wishlist cleared");
      setWishlistItems([]);
    } catch (error) {
      toast.error("Failed to clear wishlist");
      console.error("Clear error:", error);
    }
  };

  const addToCart = async (productId, quantity = 1) => {
    try {
      console.log("imageURL:", im);
      const response = await fetch(
        "https://agrofarm-vd8i.onrender.com/api/wishlist/addtocart",
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId, quantity }),
        }
      );

      if (!response.ok) throw new Error("Failed to add to cart");

      toast.success("Item added to cart");
      fetchWishlist();
    } catch (error) {
      toast.error("Failed to add to cart");
      console.error("Add to cart error:", error);
      fetchWishlist();
    }
  };

  if (loading) {
    return (
      <div className="text-center py-10 text-lg font-medium">
        Loading wishlist...
      </div>
    );
  }

  if (wishlistItems.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-800">
          Your wishlist is empty
        </h2>
        <p className="text-gray-600 mt-2">Add some products to your wishlist</p>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto px-4 py-10">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <h1 className="text-3xl font-bold text-gray-800">My Wishlist</h1>
          <button
            onClick={emptyWishlist}
            className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-lg shadow"
          >
            Clear All
          </button>
        </div>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {wishlistItems.map((item) => {
            const product = item.productId || {};
            const firstImage =
              product.images?.[0] || "/placeholder-product.jpg";
            return (
              <motion.div
                key={item._id}
                className="bg-white rounded-xl shadow overflow-hidden flex flex-col"
                variants={cardVariants}
                whileHover={{
                  y: -6,
                  scale: 1.01,
                  boxShadow: "0 20px 35px rgba(34,197,94,0.15)",
                }}
              >
                <div className="bg-gray-100 h-48 w-full overflow-hidden">
                  <img
                    src={firstImage}
                    alt={product.name}
                    className="h-full w-full cursor-zoom-in object-cover rounded-t-xl"
                    onClick={() => openPreview(product)}
                  />
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {product.name}
                    </h3>
                    <p className="text-green-600 font-medium">
                      ${product.price} per {product.unit}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Supplier: {product.upLoadedBy?.uploaderName || "Unknown"}
                    </p>
                    <p className="text-sm text-gray-500">
                      Added on: {new Date(item.addedAt).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-500">
                      Available: {product.isAvailable ? "Yes" : "No"}
                    </p>
                  </div>

                  <div className="flex justify-between items-center mt-4">
                    <button
                      onClick={() => removeItemFromWishlist(product._id)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                    <button
                      onClick={() => addToCart(product._id, 1)}
                      className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-lg"
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
      <ProductPreviewModal />
    </>
  );
};

export default Wishlist;
