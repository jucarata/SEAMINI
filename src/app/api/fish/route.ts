import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { sanitizeFishName } from "@/lib/sanitizeFishName";

export async function GET() {
  try {
    const fishDir = path.join(process.cwd(), "public", "assets", "fish");
    const files = await readdir(fishDir);

    const fish = files
      .filter((file) => file.endsWith(".png"))
      .map((file) => ({
        fileName: file.replace(/\.png$/i, ""),
        url: `/assets/fish/${file}`,
      }))
      .sort((a, b) => a.fileName.localeCompare(b.fileName));

    return Response.json({ fish });
  } catch {
    return Response.json({ fish: [] });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: string; image?: string };

    if (!body.name || typeof body.name !== "string") {
      return Response.json({ error: "El nombre del pez es obligatorio." }, { status: 400 });
    }

    if (!body.image || typeof body.image !== "string") {
      return Response.json({ error: "La imagen del pez es obligatoria." }, { status: 400 });
    }

    const fileName = sanitizeFishName(body.name);
    if (!fileName) {
      return Response.json(
        { error: "Nombre inválido. Usa letras, números, guiones o guiones bajos." },
        { status: 400 },
      );
    }

    const prefix = "data:image/png;base64,";
    if (!body.image.startsWith(prefix)) {
      return Response.json({ error: "Formato de imagen inválido." }, { status: 400 });
    }

    const base64 = body.image.slice(prefix.length);
    const buffer = Buffer.from(base64, "base64");

    if (buffer.length === 0) {
      return Response.json({ error: "La imagen está vacía." }, { status: 400 });
    }

    const fishDir = path.join(process.cwd(), "public", "assets", "fish");
    await mkdir(fishDir, { recursive: true });
    await writeFile(path.join(fishDir, `${fileName}.png`), buffer);

    return Response.json({
      success: true,
      fileName,
      url: `/assets/fish/${fileName}.png`,
    });
  } catch {
    return Response.json({ error: "No se pudo guardar el pez." }, { status: 500 });
  }
}
