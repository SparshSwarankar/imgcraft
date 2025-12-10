"""Shared image-handling helpers for ImgCraft."""
from __future__ import annotations

import math
import os
from typing import Tuple

from PIL import Image, ImageOps, ImageFile
from werkzeug.datastructures import FileStorage

from config import config

# Protect against decompression bombs
Image.MAX_IMAGE_PIXELS = config.MAX_PIXELS
ImageFile.LOAD_TRUNCATED_IMAGES = True


def _format_bytes(num_bytes: int) -> str:
    if num_bytes < 1024:
        return f"{num_bytes} B"
    power = min(int(math.log(num_bytes, 1024)), 4)
    units = ['B', 'KB', 'MB', 'GB', 'TB']
    value = num_bytes / (1024 ** power)
    return f"{value:.1f} {units[power]}"


def ensure_file_within_limit(file_storage: FileStorage) -> int:
    """Ensure upload is within configured request limits."""
    stream = file_storage.stream
    current_pos = stream.tell()
    stream.seek(0, os.SEEK_END)
    size = stream.tell()
    stream.seek(0)
    stream.seek(current_pos)
    if size > config.MAX_CONTENT_LENGTH:
        raise ValueError(
            f"File is too large. Limit: {_format_bytes(config.MAX_CONTENT_LENGTH)}, "
            f"received {_format_bytes(size)}"
        )
    return size


def load_image_safe(
    file_storage: FileStorage,
    *,
    max_side: int | None = None,
) -> Tuple[Image.Image, Tuple[int, int]]:
    """Load an image, enforcing size limits and orientation."""
    ensure_file_within_limit(file_storage)
    file_storage.stream.seek(0)
    with Image.open(file_storage.stream) as img:
        original_format = img.format
        img = ImageOps.exif_transpose(img)
        width, height = img.size
        total_pixels = width * height
        if total_pixels > config.MAX_PIXELS:
            raise ValueError(
                f"Image dimensions too large. Limit {config.MAX_PIXELS:,} pixels, "
                f"received {total_pixels:,}"
            )
        img_copy = img.copy()
    if max_side and max(img_copy.size) > max_side:
        img_copy.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
    img_copy.format = original_format
    return img_copy, img_copy.size
