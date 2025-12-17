const PROFILE_ENDPOINTS = {
  farmer: "https://agrofarm-vd8i.onrender.com/api/farmers/me",
  buyer: "https://agrofarm-vd8i.onrender.com/api/buyers/me",
  supplier: "https://agrofarm-vd8i.onrender.com/api/suppliers/me",
  admin: null, // Admin doesn't have a profile endpoint
};

export async function fetchProfileForRole(role) {
  const endpoint = PROFILE_ENDPOINTS[role];

  // Admin role doesn't have a profile endpoint, return empty profile
  if (role === "admin" || !endpoint) {
    return { name: "", email: "", phone: "", address: "", img: "" };
  }

  const response = await fetch(endpoint, {
    credentials: "include",
  });

  if (!response.ok) {
    // Don't throw error, just return empty profile
    return { name: "", email: "", phone: "", address: "", img: "" };
  }

  const data = await response.json();
  const {
    name = "",
    email = "",
    phone = "",
    address = "",
    img = "",
  } = data.user || {};

  return { name, email, phone, address, img };
}
