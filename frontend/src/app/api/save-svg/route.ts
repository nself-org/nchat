import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";

import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const { svg, filename } = await request.json();

    if (!svg || !filename) {
      return NextResponse.json(
        { error: "Missing svg or filename" },
        { status: 400 },
      );
    }

    // Ensure filename is safe
    const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "");
    if (!safeFilename.endsWith(".svg")) {
      return NextResponse.json(
        { error: "Filename must end with .svg" },
        { status: 400 },
      );
    }

    // Save to public directory
    const publicPath = path.join(process.cwd(), "public", safeFilename);
    await writeFile(publicPath, svg, "utf-8");

    return NextResponse.json({
      success: true,
      path: `/${safeFilename}`,
    });
  } catch (error) {
    logger.error("Error saving SVG:", error);
    return NextResponse.json({ error: "Failed to save SVG" }, { status: 500 });
  }
}
