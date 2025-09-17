
export interface ExtractedIcon {
  id: string;
  svgString: string;
  dataUri: string;
  altText?: string;
}

export interface AITaggedIcon extends ExtractedIcon {
  title: string;
  keywords: string[];
}
