import { useCallback, useState } from "react";
import ProductDetailModal from "../components/ProductDetailModal";

const normalizeProduct = (product) => {
  if (!product) return product;
  const normalized = { ...product };

  if (!normalized._id && normalized.productId) {
    normalized._id = normalized.productId;
  }

  if (!normalized.name && normalized.productName) {
    normalized.name = normalized.productName;
  }

  if (!normalized.description && normalized.details) {
    normalized.description = normalized.details;
  }

  if (
    (!normalized.images || normalized.images.length === 0) &&
    (normalized.image || normalized.img)
  ) {
    normalized.images = [normalized.image || normalized.img];
  }

  if (!normalized.unit && normalized.measurementUnit) {
    normalized.unit = normalized.measurementUnit;
  }

  if (
    normalized.quantity === undefined &&
    (normalized.availableQuantity || normalized.stock)
  ) {
    normalized.quantity = normalized.availableQuantity || normalized.stock;
  }

  if (normalized.price === undefined && normalized.cost) {
    normalized.price = normalized.cost;
  }

  return normalized;
};

export function useProductPreview() {
  const [selectedProduct, setSelectedProduct] = useState(null);

  const openPreview = useCallback((product) => {
    if (!product) return;
    setSelectedProduct(normalizeProduct(product));
  }, []);

  const closePreview = useCallback(() => {
    setSelectedProduct(null);
  }, []);

  const ProductPreviewModal = () => (
    <ProductDetailModal
      product={selectedProduct}
      isOpen={Boolean(selectedProduct)}
      onClose={closePreview}
    />
  );

  return {
    openPreview,
    closePreview,
    ProductPreviewModal,
  };
}
