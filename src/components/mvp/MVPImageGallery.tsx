import React, { useState, useEffect } from 'react';

interface MVPImageGalleryProps {
  imageUrls: string[] | undefined;
  mvpTitle?: string;
}

const MVPImageGallery: React.FC<MVPImageGalleryProps> = ({ imageUrls, mvpTitle = "MVP" }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (imageUrls && imageUrls.length > 0) {
      setSelectedImage(imageUrls[0]);
    } else {
      setSelectedImage(null);
    }
  }, [imageUrls]);

  if (!imageUrls || imageUrls.length === 0) {
    return (
      <div className="text-center p-4 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
        <p className="text-gray-600 dark:text-gray-400">No preview images available.</p>
      </div>
    );
  }

  if (imageUrls.length === 1) {
    return (
       <div className="w-full h-auto bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden flex items-center justify-center">
         <img
             src={imageUrls[0]}
             alt={`${mvpTitle} preview`}
             className="w-full h-auto object-contain rounded-lg shadow-md max-h-[400px] md:max-h-[500px]"
         />
       </div>
    );
  }

  if (!selectedImage) {
    return (
        <div className="text-center p-4 border dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
            <p className="text-gray-600 dark:text-gray-400">Loading images...</p>
        </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Main Image */}
      <div className="w-full h-[300px] sm:h-[400px] md:h-[500px] bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden flex items-center justify-center shadow-lg">
       <img
           src={selectedImage}
           alt={`${mvpTitle} selected preview`}
           className="w-full h-full object-contain transition-opacity duration-300 ease-in-out"
       />
      </div>

      {/* Thumbnails */}
      <div className="flex space-x-2 overflow-x-auto p-1 pb-2">
        {imageUrls.map((url, index) => (
          <button
            key={index}
            onClick={() => setSelectedImage(url)}
            className={`flex-shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-md overflow-hidden border-2 transition-all duration-150 ease-in-out
                        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800
                        ${selectedImage === url ? 'border-indigo-500 dark:border-indigo-400 scale-105 shadow-md' : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500'}`}
          >
            <img
              src={url}
              alt={`${mvpTitle} thumbnail ${index + 1}`}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
};

export default MVPImageGallery;