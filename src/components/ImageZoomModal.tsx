import React, { useEffect, useRef, useState } from 'react';

import { ActionIcon, Group, Image, Modal, Slider, Stack } from '@mantine/core';
import {
  IconArrowDown,
  IconArrowLeft,
  IconArrowRight,
  IconArrowUp,
  IconMinus,
  IconPlus,
  IconRestore,
  IconRotateClockwise,
  IconRotate,
} from '@tabler/icons-react';

import { device } from '@credo/base-ui/utils';

const isMobileDevice = device.isMobile;

type ImageZoomModalProps = {
  opened: boolean;
  onClose: () => void;
  imageUrl: string;
};

export function ImageZoomModal({ opened, onClose, imageUrl }: ImageZoomModalProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLDivElement>(null);

  
  
  useEffect(() => {
    if (!opened) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setRotation(0);
      setIsDragging(false);
    }
  }, [opened]);
  

  
  useEffect(() => {
    if (isMobileDevice) return;

    const handleWheel = (e: WheelEvent) => {
      if (!opened || !imageRef.current?.contains(e.target as Node)) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setScale((prev) => Math.min(Math.max(prev + delta, 1), 5));
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [opened]);

  
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isMobileDevice && scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMobileDevice && isDragging && scale > 1) {
      setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => {
    if (!isMobileDevice) setIsDragging(false);
  };

  
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isMobileDevice && scale > 1 && e.touches.length === 1) {
      e.preventDefault();
      setIsDragging(true);
      const touch = e.touches[0];
      setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isMobileDevice && isDragging && scale > 1 && e.touches.length === 1) {
      e.preventDefault();
      const touch = e.touches[0];
      setPosition({ x: touch.clientX - dragStart.x, y: touch.clientY - dragStart.y });
    }
  };

  const handleTouchEnd = () => {
    if (isMobileDevice) setIsDragging(false);
  };

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.5, 5));
  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.5, 1));
    if (scale <= 1.5) setPosition({ x: 0, y: 0 });
  };
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const handleRotateCounterClockwise = () => setRotation((prev) => (prev - 90 + 360) % 360);
  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
  };

  const PAN_STEP = 50;
  const handlePanUp = () => setPosition((prev) => ({ ...prev, y: prev.y + PAN_STEP }));
  const handlePanDown = () => setPosition((prev) => ({ ...prev, y: prev.y - PAN_STEP }));
  const handlePanLeft = () => setPosition((prev) => ({ ...prev, x: prev.x + PAN_STEP }));
  const handlePanRight = () => setPosition((prev) => ({ ...prev, x: prev.x - PAN_STEP }));

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      size={isMobileDevice ? undefined : 'auto'}
      withCloseButton={false}
      padding={0}
      styles={{
        body: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.95)',
          padding: '2px',
          overflow: 'hidden',
          position: 'relative',
        },
        content: {
          backgroundColor: 'transparent',
          
          
          
          
          width: 'fit-content',
          maxHeight: '95vh',
          maxWidth: '95vw',
        },
      }}
    >
      {/* Zoom slider + rotate controls */}
      <Group
        gap="xs"
        wrap="nowrap"
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          left: 20,
          zIndex: 1000,
        }}
      >
        <ActionIcon
          size="lg"
          variant="filled"
          color="dark"
          onClick={handleZoomOut}
          disabled={scale <= 1}
        >
          <IconMinus size={20} />
        </ActionIcon>
        <Slider
          value={scale}
          onChange={(v) => {
            setScale(v);
            if (v <= 1) setPosition({ x: 0, y: 0 });
          }}
          min={1}
          max={5}
          step={0.1}
          label={(v) => `${v.toFixed(1)}x`}
          style={{ flex: 1 }}
          color="gray"
          size="sm"
          styles={{
            track: { backgroundColor: 'rgba(255, 255, 255, 0.2)' },
            thumb: { borderColor: 'white', backgroundColor: 'white' },
          }}
        />
        <ActionIcon
          size="lg"
          variant="filled"
          color="dark"
          onClick={handleZoomIn}
          disabled={scale >= 5}
        >
          <IconPlus size={20} />
        </ActionIcon>
        <ActionIcon size="lg" variant="filled" color="dark" onClick={handleRotateCounterClockwise}>
          <IconRotate size={20} />
        </ActionIcon>
        <ActionIcon size="lg" variant="filled" color="dark" onClick={handleRotate}>
          <IconRotateClockwise size={20} />
        </ActionIcon>
        <ActionIcon
          size="lg"
          variant="filled"
          color="dark"
          onClick={handleReset}
          disabled={scale === 1 && rotation === 0 && position.x === 0 && position.y === 0}
        >
          <IconRestore size={20} />
        </ActionIcon>
      </Group>

      {/* Mobile pan controls (when zoomed) */}
      {isMobileDevice && scale > 1 && (
        <Stack gap={6} style={{ position: 'absolute', top: 20, right: 20, zIndex: 1000 }}>
          <Group gap={6} justify="center">
            <ActionIcon size="lg" variant="filled" color="dark" onClick={handlePanUp} radius="md">
              <IconArrowUp size={20} />
            </ActionIcon>
          </Group>
          <Group gap={6}>
            <ActionIcon size="lg" variant="filled" color="dark" onClick={handlePanLeft} radius="md">
              <IconArrowLeft size={20} />
            </ActionIcon>
            <ActionIcon size="lg" variant="filled" color="dark" onClick={handlePanDown} radius="md">
              <IconArrowDown size={20} />
            </ActionIcon>
            <ActionIcon
              size="lg"
              variant="filled"
              color="dark"
              onClick={handlePanRight}
              radius="md"
            >
              <IconArrowRight size={20} />
            </ActionIcon>
          </Group>
        </Stack>
      )}

      <div
        ref={imageRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px) rotate(${rotation}deg)`,
          transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          cursor: isMobileDevice
            ? 'pointer'
            : scale > 1
              ? isDragging
                ? 'grabbing'
                : 'grab'
              : 'pointer',
          touchAction: scale > 1 ? 'none' : 'auto',
        }}
      >
        <Image
          src={imageUrl}
          alt="Preview"
          fit="contain"
          onClick={scale === 1 ? onClose : undefined}
          style={{
            maxHeight: '90vh',
            maxWidth: '90vw',
            width: 'auto',
            height: 'auto',
            userSelect: 'none',
            pointerEvents: scale > 1 ? 'none' : 'auto',
          }}
        />
      </div>
    </Modal>
  );
}
