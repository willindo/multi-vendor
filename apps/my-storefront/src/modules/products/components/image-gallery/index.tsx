import { Container } from "@medusajs/ui"
import { HttpTypes } from "@medusajs/types"
import Image from "next/image"

type ImageGalleryProps = {
  images: HttpTypes.StoreProductImage[]
}

const ImageGallery = ({
  images,
}: ImageGalleryProps) => {
  if (!images.length) {
    return (
      <Container className="aspect-[4/5] flex items-center justify-center">
        <span className="text-sm text-ui-fg-muted">
          No image available
        </span>
      </Container>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-y-4">
      {images.map((image, index) => {
        if (!image.url) {
          return null
        }

        return (
          <div
            key={image.id ?? index}
            className="relative aspect-[4/5] overflow-hidden rounded-rounded"
          >
            <Image
              src={image.url}
              priority={index <= 1}
              alt={`Product image ${index + 1}`}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        )
      })}
    </div>
  )
}

export default ImageGallery