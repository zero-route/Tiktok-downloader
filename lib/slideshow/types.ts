
export type SlideshowInput = {
  images: string[];
  audioUrl: string;
};

export type SlideshowResult = {
  buffer: Buffer;
  duration: number;
  imageCount: number;
};
