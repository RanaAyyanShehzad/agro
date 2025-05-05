export const updateCartExpiration = async (cart) => {
    // Update the expiration time (e.g., 7 days from now)
    cart.expiresAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    cart.lastActivity = new Date();
    return cart;
  };