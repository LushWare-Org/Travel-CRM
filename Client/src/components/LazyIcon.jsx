import { useState, useEffect } from 'react';
export default function LazyIcon({ name, size = 16, ...props }) {
  const [Icon, setIcon] = useState(null);

  useEffect(() => {
    let cancelled = false;
    import('lucide-react')
      .then(mod => {
        if (!cancelled && mod?.[name]) {
          setIcon(() => mod[name]);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [name]);

  if (!Icon) {
    return (
      <span 
        className={props.className} 
        style={{ display: 'inline-block', width: size, height: size }} 
      />
    );
  }

  return <Icon size={size} {...props} />;
}
