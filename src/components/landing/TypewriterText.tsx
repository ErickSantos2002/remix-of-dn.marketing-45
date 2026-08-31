import { useState, useEffect } from 'react';

interface TypewriterTextProps {
  texts: string[];
  className?: string;
  typeSpeed?: number;
  deleteSpeed?: number;
  pauseDuration?: number;
}

export function TypewriterText({ 
  texts, 
  className = "",
  typeSpeed = 100,
  deleteSpeed = 40,
  pauseDuration = 1500
}: TypewriterTextProps) {
  const [currentText, setCurrentText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const speed = isDeleting ? deleteSpeed : typeSpeed;
    const currentFullText = texts[currentIndex];
    
    const timer = setTimeout(() => {
      if (!isDeleting) {
        // Typing
        if (currentText.length < currentFullText.length) {
          setCurrentText(currentFullText.substring(0, currentText.length + 1));
        } else {
          // Finished typing, start deleting after delay
          setTimeout(() => setIsDeleting(true), pauseDuration);
        }
      } else {
        // Deleting
        if (currentText.length > 0) {
          setCurrentText(currentText.substring(0, currentText.length - 1));
        } else {
          // Finished deleting, move to next text
          setIsDeleting(false);
          setCurrentIndex((prevIndex) => (prevIndex + 1) % texts.length);
        }
      }
    }, speed);

    return () => clearTimeout(timer);
  }, [currentText, currentIndex, isDeleting, texts, typeSpeed, deleteSpeed, pauseDuration]);

  return (
    <span className={className}>
      {currentText}
      <span className="animate-pulse text-primary">|</span>
    </span>
  );
}
