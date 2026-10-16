# Standar & Aturan Proyek Santriva (Project Guidelines)

## 1. Aturan Tampilan & Desain Tombol (Wajib)
**Semua tombol di aplikasi ini WAJIB hanya menampilkan ICON saja secara default.**
- **Default State (Normal):** Hanya icon yang terlihat (hemat ruang, minimalis, dan rapi).
- **Interactive State (Hover / Klik / Fokus):** Saat kursor mouse diarahkan (hover) ATAU saat tombol diklik / disentuh / difokuskan, tombol secara otomatis memanjang/melebar halus menampilkan teks keterangannya.
- **Implementasi:**
  - Gunakan komponen standar `<IconButton />` atau `<IconButtonLink />` dari `@/components/common/IconButton`.
  - Atau gunakan kelas CSS utility bawaan:
    ```html
    <button className="btn-icon-reveal bg-emerald-800 text-white p-2.5 rounded-xl font-bold" title="Keterangan">
      <Icon className="w-4 h-4" />
      <span className="btn-label">Teks Keterangan</span>
    </button>
    ```
  - Selalu sertakan `title="..."` dan `aria-label="..."` pada tombol untuk aksesibilitas.
  - **PENTING:** Aturan ini berlaku untuk semua tombol yang ada saat ini dan **SELURUH** tombol yang akan dibuat di masa mendatang!

## 2. Aturan Standarisasi Penulisan Nama Santri
- Format baku nama santri di database dan tampilan adalah **Title Case** (contoh: `Ahmad Said`, bukan `AHMAD SAID` atau `ahmad said`).
- Menjaga apostrof Arab (cth: `Ma'arif`, `Syifa'ul`, `Syafi'i`).
- Menstandarisasi partikel Arab (`Al-`, `As-`, `Az-`).
- Semua fungsi insert/update/import (`sanitizePayload`, `handleSubmit`, `handleApprove`) wajib melewatkan `nama_lengkap` melalui utilitas `formatSantriName` dari `@/utils/nameFormat`.
