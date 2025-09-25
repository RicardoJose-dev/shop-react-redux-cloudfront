import { getGalleryData } from "./data"

export async function main(event: any) {
  const productId = event.productId

  const galleryItem = (await getGalleryData()).find(
    ({ id }) => id === productId
  )

  if (!galleryItem) {
    throw new Error("Product not found")
  }

  return galleryItem
}
