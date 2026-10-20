import { LayoutMode, Paper } from './layout';

/** The uploaded ticket artwork and where the serial number sits on it. */
export type TicketDesign = {
  /** Copy of the picked image inside the app's document folder. */
  uri: string;
  /** Pixel size of the image. */
  width: number;
  height: number;
  /** Centre of the serial number, as a fraction of the ticket (0..1, from top-left). */
  numberX: number;
  numberY: number;
  /** Serial number size in points (1/72 in) on the printed ticket. */
  fontSize: number;
  color: string;
};

export type TicketStatus = 'Sold' | 'Unsold';

/** One row of the shared sheet: one serial number. */
export type TicketRow = {
  serial: string;
  buyer: string;
  phone: string;
  price: string;
  soldBy: string;
  /** "2026-10-20 14:05", local time, or empty while unsold. */
  soldAt: string;
  status: TicketStatus;
};

export type Sale = Pick<TicketRow, 'buyer' | 'phone' | 'price' | 'soldBy'>;

/** A change waiting to reach the Google Sheet. */
export type PendingOp =
  | { id: string; type: 'ensure'; serials: string[] }
  | { id: string; type: 'sell'; serial: string; sale: Sale; soldAt: string; force: boolean }
  | { id: string; type: 'clear'; serial: string };

export type Settings = {
  /** The Apps Script web app URL ending in /exec. Empty = not connected. */
  sheetUrl: string;
  teamKey: string;
  sellerName: string;
  defaultPrice: string;
  paper: Paper;
  layoutMode: LayoutMode;
  /** The number the next generated batch starts from. */
  nextNumber: number;
};

export const DEFAULT_SETTINGS: Settings = {
  sheetUrl: '',
  teamKey: '',
  sellerName: '',
  defaultPrice: '',
  paper: 'A4',
  layoutMode: 'sheet',
  nextNumber: 1,
};
