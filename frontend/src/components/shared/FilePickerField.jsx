import { resolveAssetUrl } from "@/utils/resolveAssetUrl";

function FilePickerField({
  label,
  accept = "image/*",
  multiple = false,
  onChange,
  disabled = false,
  helperText = "",
  error = "",
  previewUrls = [],
}) {
  return (
    <label className="block">
      <span className="text-sm text-slate-300">{label}</span>
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={(event) => {
          onChange?.(Array.from(event.target.files || []));
          event.target.value = "";
        }}
        className="mt-1 block w-full rounded-[10px] border border-[color:rgb(var(--ui-border)/0.28)] bg-[rgb(var(--bg-muted)/0.9)] px-3 py-2 text-sm text-[rgb(var(--text-base))] file:mr-3 file:rounded-md file:border-0 file:bg-[rgb(var(--accent-primary))] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-[rgb(var(--accent-primary)/0.88)]"
      />
      {helperText ? <p className="mt-1 text-xs text-slate-400">{helperText}</p> : null}
      {error ? <p className="mt-1 text-xs text-red-300">{error}</p> : null}

      {previewUrls.length ? (
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {previewUrls.map((url) => (
            <a
              key={url}
              href={resolveAssetUrl(url)}
              target="_blank"
              rel="noreferrer"
              className="overflow-hidden rounded-lg border border-[color:rgb(var(--ui-border)/0.28)]"
            >
              <img src={resolveAssetUrl(url)} alt="Selected file preview" className="h-20 w-full object-cover" />
            </a>
          ))}
        </div>
      ) : null}
    </label>
  );
}

export default FilePickerField;
