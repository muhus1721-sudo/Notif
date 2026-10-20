import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';

import { MIN_LONG_PX, MIN_SHORT_PX, TICKET_LONG_IN, TICKET_SHORT_IN } from './layout';
import { detectImageKind } from './pdf';
import { CAP_HEIGHT, formatSerial, serialWidth } from './serial';
import { TicketDesign } from './types';

const DESIGN_DIR = 'ticket-design';

/**
 * Lets the user pick their finished ticket artwork and keeps a private copy,
 * so the design survives the photo being deleted from the gallery.
 * Returns null if they backed out.
 */
export async function pickDesign(previous: TicketDesign | null): Promise<TicketDesign | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    // Full quality and no cropping, so the original file comes back untouched.
    quality: 1,
    allowsEditing: false,
    preferredAssetRepresentationMode:
      ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
  });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];

  const picked = new File(asset.uri);
  const bytes = await picked.bytes();
  const kind = detectImageKind(bytes);
  if (!kind) {
    throw new Error('Please choose a PNG or JPG image. Export your design from Canva or Photoshop as PNG.');
  }

  const dir = new Directory(Paths.document, DESIGN_DIR);
  dir.create({ idempotent: true, intermediates: true });
  // A fresh name each time so the preview never shows a cached older design.
  const copy = new File(dir, `design-${Date.now()}.${kind}`);
  copy.write(bytes);
  if (previous) {
    try {
      new File(previous.uri).delete();
    } catch {
      // Already gone — nothing to clean up.
    }
  }

  return {
    uri: copy.uri,
    width: asset.width,
    height: asset.height,
    // Keep the old number placement if they are only swapping the artwork.
    numberX: previous?.numberX ?? 0.85,
    numberY: previous?.numberY ?? 0.5,
    fontSize: previous?.fontSize ?? 18,
    color: previous?.color ?? '#000000',
  };
}

export const readDesignBytes = (design: TicketDesign) => new File(design.uri).bytes();

/** Plain-English problems with the design; empty when it's ready to print. */
export function designWarnings(design: TicketDesign): string[] {
  const out: string[] = [];
  const long = Math.max(design.width, design.height);
  const short = Math.min(design.width, design.height);

  if (long < MIN_LONG_PX || short < MIN_SHORT_PX) {
    const dpi = Math.round(Math.min(long / TICKET_LONG_IN, short / TICKET_SHORT_IN));
    out.push(
      `The image is ${design.width} × ${design.height} px, about ${dpi} DPI when printed. ` +
        `For sharp print use at least ${MIN_LONG_PX} × ${MIN_SHORT_PX} px (300 DPI).`
    );
  }

  const ratio = long / short;
  const target = TICKET_LONG_IN / TICKET_SHORT_IN;
  if (Math.abs(ratio - target) / target > 0.02) {
    out.push(
      `The image is not 2 : 1 like a ${TICKET_LONG_IN} × ${TICKET_SHORT_IN} in ticket, ` +
        'so it will be stretched to fit. Export it at the ticket size for the best result.'
    );
  }

  // The serial must clear the cut by ~3 mm, since cutting is never perfect.
  const landscape = design.width >= design.height;
  const ticketW = (landscape ? TICKET_LONG_IN : TICKET_SHORT_IN) * 72;
  const ticketH = (landscape ? TICKET_SHORT_IN : TICKET_LONG_IN) * 72;
  const safe = 8.5;
  const halfW = serialWidth(formatSerial(100), design.fontSize) / 2;
  const halfH = (CAP_HEIGHT * design.fontSize) / 2;
  const cx = design.numberX * ticketW;
  const cy = design.numberY * ticketH;
  if (cx - halfW < safe || cx + halfW > ticketW - safe || cy - halfH < safe || cy + halfH > ticketH - safe) {
    out.push('The serial number is too close to the edge and may get cut. Move it further in.');
  }
  return out;
}

export async function sharePdf(bytes: Uint8Array, name: string): Promise<string> {
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.write(bytes);
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Send tickets to the printer',
    UTI: 'com.adobe.pdf',
  });
  return file.uri;
}

export async function shareCsv(csv: string, name: string): Promise<void> {
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.write(csv);
  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    dialogTitle: 'Share ticket sales',
    UTI: 'public.comma-separated-values-text',
  });
}
