# Chat Message Animations

## ✨ Slide-In Animation for New Messages

New messages now smoothly slide in from the bottom with a fade effect!

### How It Works

1. **Message Tracking**: We track which message IDs have been displayed using `displayedMessageIdsRef`
2. **New Message Detection**: When a message appears that hasn't been seen before, it gets animated
3. **Initial Load Exception**: Messages on initial load DON'T animate (only new incoming messages)
4. **Player Switch Reset**: When switching players, the tracking resets for fresh animations

### Animation Details

- **Duration**: 300ms
- **Easing**: ease-out (smooth deceleration)
- **Effect**: Slides up from 1rem (16px) below while fading in
- **Hardware Accelerated**: Uses `willChange` for GPU acceleration

### Customization

You can adjust the animation in `tailwind.config.js`:

```js
keyframes: {
  'slide-in-from-bottom': {
    '0%': { transform: 'translateY(1rem)', opacity: '0' },
    '100%': { transform: 'translateY(0)', opacity: '1' },
  },
},
animation: {
  'slide-in-from-bottom-4': 'slide-in-from-bottom 0.3s ease-out',
},
```

### Want Different Animations?

#### Slide from Right (for admin messages)
```js
'slide-in-from-right': {
  '0%': { transform: 'translateX(1rem)', opacity: '0' },
  '100%': { transform: 'translateX(0)', opacity: '1' },
}
```

#### Scale Up
```js
'scale-in': {
  '0%': { transform: 'scale(0.95)', opacity: '0' },
  '100%': { transform: 'scale(1)', opacity: '1' },
}
```

#### Bounce In
```js
'bounce-in': {
  '0%': { transform: 'scale(0.3)', opacity: '0' },
  '50%': { transform: 'scale(1.05)' },
  '70%': { transform: 'scale(0.9)' },
  '100%': { transform: 'scale(1)', opacity: '1' },
}
```

### Performance Notes

- ✅ Only animates truly new messages
- ✅ Uses CSS animations (GPU accelerated)
- ✅ No JavaScript animation loops
- ✅ Minimal performance impact
- ✅ Works smoothly even with many messages

## Future Enhancements

Want to add more animations? Consider:
- Typing indicator animation (already have bubble bouncing)
- Smooth scroll to new message
- Highlight/flash effect for mentions
- Image loading skeleton animation
- Reaction bubble animations
