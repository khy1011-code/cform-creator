// The rose mark — replaced by the uploaded profile photo when present.
export function RoseMark({ photo, size }) {
  const style = size ? { width: size, height: size } : undefined;
  if (photo) {
    return (
      <div className="logo-rose" style={style}>
        <img src={photo} alt="Profile" />
      </div>
    );
  }
  return (
    <div className="logo-rose" style={style}>
      <svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="26" cy="30" rx="14" ry="14" fill="#e89aad" opacity="0.6" />
        <ellipse cx="26" cy="22" rx="11" ry="11" fill="#f5c8d4" opacity="0.7" />
        <ellipse cx="20" cy="28" rx="9" ry="9" fill="#d4788f" opacity="0.5" />
        <ellipse cx="32" cy="26" rx="8" ry="8" fill="#f0b0c0" opacity="0.5" />
        <ellipse cx="26" cy="20" rx="7" ry="7" fill="#f8d8e0" opacity="0.8" />
        <circle cx="26" cy="22" r="4" fill="#fff" opacity="0.3" />
      </svg>
    </div>
  );
}

export function Wordmark({ brand, photo }) {
  return (
    <div className="logo-wrap">
      <RoseMark photo={photo} />
      <div className="logo-text">
        <div className="logo-brand">
          {brand.wordmarkA}
          <span>{brand.wordmarkB}</span>
        </div>
        <div className="logo-sub">{brand.tagline}</div>
      </div>
    </div>
  );
}
