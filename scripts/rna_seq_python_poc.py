#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import logging
import math
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from zipfile import ZIP_DEFLATED, ZipFile


LOGGER = logging.getLogger("rna_seq_python_poc")


@dataclass
class PipelineInputs:
    counts: Any
    metadata: Any
    sample_column: str


@dataclass
class DifferentialExpressionOutputs:
    counts: Any
    metadata: Any
    normalized_counts: Any
    results: Any
    significant: Any
    upregulated: Any
    downregulated: Any
    ranked_scores: Any
    summary: dict[str, Any]


def _import_dependency(module_name: str, package_name: str | None = None) -> Any:
    try:
        return __import__(module_name, fromlist=["*"])
    except ImportError as exc:
        package = package_name or module_name
        raise RuntimeError(
            f"Missing dependency '{package}'. Install it before running this script."
        ) from exc


def _configure_logging(verbose: bool = False) -> None:
    logging.basicConfig(
        level=logging.DEBUG if verbose else logging.INFO,
        format="%(asctime)s | %(levelname)s | %(message)s",
    )


def _read_tabular_file(file_path: Path) -> Any:
    pd = _import_dependency("pandas")

    suffix = file_path.suffix.lower()
    if suffix in {".xlsx", ".xls"}:
        return pd.read_excel(file_path)
    if suffix in {".tsv", ".txt"}:
        return pd.read_csv(file_path, sep="\t")
    if suffix == ".csv":
        return pd.read_csv(file_path)

    return pd.read_csv(file_path, sep=None, engine="python")


def _prepare_counts_dataframe(raw_counts: Any) -> Any:
    pd = _import_dependency("pandas")

    counts = raw_counts.copy()
    if counts.empty:
        raise ValueError("Counts matrix is empty.")

    first_column = counts.columns[0]
    if (
        first_column not in counts.select_dtypes(include=["number"]).columns
        or str(first_column).lower() in {"gene", "gene_id", "genes", "symbol", "id", "entrezid"}
    ):
        counts = counts.set_index(first_column)

    counts.index = counts.index.map(str)
    counts.columns = [str(column).strip() for column in counts.columns]
    counts = counts.loc[:, ~pd.Index(counts.columns).duplicated()]
    counts = counts.apply(pd.to_numeric, errors="coerce")

    if counts.isna().all().all():
        raise ValueError("Counts matrix does not contain numeric sample columns.")

    counts = counts.fillna(0)
    counts = counts.groupby(level=0).sum()
    counts = counts.loc[counts.sum(axis=1) > 0]
    counts = counts.loc[:, counts.sum(axis=0) > 0]
    return counts


def _detect_sample_column(metadata: Any, sample_names: list[str]) -> str:
    candidates = [
        "sample_id",
        "sample",
        "sample_name",
        "Sample",
        "SampleID",
        "sampleid",
        "run",
    ]

    for candidate in candidates:
        if candidate in metadata.columns:
            return candidate

    best_column = ""
    best_overlap = -1
    sample_name_set = {str(name) for name in sample_names}
    for column in metadata.columns:
        overlap = sum(str(value) in sample_name_set for value in metadata[column].astype(str))
        if overlap > best_overlap:
            best_overlap = overlap
            best_column = str(column)

    if best_column and best_overlap > 0:
        return best_column

    raise ValueError("Could not detect sample identifier column in metadata.")


def _normalize_metadata(metadata: Any) -> Any:
    metadata = metadata.copy()
    metadata.columns = [str(column).strip() for column in metadata.columns]
    return metadata


def _compute_log_cpm(counts: Any) -> Any:
    np = _import_dependency("numpy")

    library_sizes = counts.sum(axis=0).replace(0, np.nan)
    counts_per_million = counts.divide(library_sizes, axis=1) * 1_000_000
    return np.log2(counts_per_million.fillna(0) + 1.0)


def _infer_gene_labels(gene_ids: list[str]) -> list[str]:
    mygene = None
    try:
        mygene = _import_dependency("mygene")
    except RuntimeError:
        return gene_ids

    looks_like_ensembl = any(gene_id.upper().startswith("ENS") for gene_id in gene_ids[:20])
    if not looks_like_ensembl:
        return gene_ids

    try:
        mg = mygene.MyGeneInfo()
        query_results = mg.querymany(
            gene_ids,
            scopes="ensembl.gene",
            fields="symbol",
            species="all",
            as_dataframe=False,
            verbose=False,
        )
    except Exception as exc:  # pragma: no cover - external service failure
        LOGGER.warning("Could not annotate Ensembl identifiers with mygene: %s", exc)
        return gene_ids

    symbol_by_query = {
        str(item.get("query")): str(item.get("symbol"))
        for item in query_results
        if isinstance(item, dict) and item.get("query") and item.get("symbol")
    }
    return [symbol_by_query.get(gene_id, gene_id) for gene_id in gene_ids]


def _save_summary_json(output_dir: Path, summary_payload: dict[str, Any]) -> Path:
    summary_path = output_dir / "summary_metrics.json"
    summary_path.write_text(json.dumps(summary_payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return summary_path


def load_inputs(counts_path: str, metadata_path: str) -> PipelineInputs:
    LOGGER.info("Loading counts matrix from %s", counts_path)
    LOGGER.info("Loading metadata from %s", metadata_path)

    counts_file = Path(counts_path).expanduser().resolve()
    metadata_file = Path(metadata_path).expanduser().resolve()

    if not counts_file.exists():
        raise FileNotFoundError(f"Counts file not found: {counts_file}")
    if not metadata_file.exists():
        raise FileNotFoundError(f"Metadata file not found: {metadata_file}")

    raw_counts = _read_tabular_file(counts_file)
    raw_metadata = _read_tabular_file(metadata_file)
    counts = _prepare_counts_dataframe(raw_counts)
    metadata = _normalize_metadata(raw_metadata)
    sample_column = _detect_sample_column(metadata, counts.columns.tolist())

    LOGGER.info("Loaded %s genes and %s samples from counts matrix", counts.shape[0], counts.shape[1])
    LOGGER.info("Detected metadata sample column: %s", sample_column)
    return PipelineInputs(counts=counts, metadata=metadata, sample_column=sample_column)


def validate_inputs(
    counts: Any,
    metadata: Any,
    condition_column: str,
    case: str,
    control: str,
    sample_column: str,
) -> tuple[Any, Any]:
    pd = _import_dependency("pandas")

    if condition_column not in metadata.columns:
        raise ValueError(f"Condition column '{condition_column}' not found in metadata.")

    selected_metadata = metadata[metadata[condition_column].astype(str).isin({case, control})].copy()
    if selected_metadata.empty:
        raise ValueError("No metadata rows match requested case/control contrast.")

    selected_metadata[sample_column] = selected_metadata[sample_column].astype(str)
    selected_metadata = selected_metadata.drop_duplicates(subset=[sample_column], keep="first")

    sample_ids = selected_metadata[sample_column].tolist()
    missing_in_counts = sorted(set(sample_ids) - set(counts.columns))
    if missing_in_counts:
        raise ValueError(f"Samples present in metadata but missing in counts: {missing_in_counts}")

    overlapping_samples = [sample_id for sample_id in counts.columns if sample_id in sample_ids]
    if len(overlapping_samples) < 2:
        raise ValueError("Need at least two overlapping samples between counts and metadata.")

    filtered_counts = counts.loc[:, overlapping_samples].copy()
    filtered_metadata = selected_metadata.set_index(sample_column).loc[overlapping_samples].copy()
    filtered_metadata[condition_column] = pd.Categorical(
        filtered_metadata[condition_column].astype(str),
        categories=[control, case],
        ordered=True,
    )

    group_sizes = filtered_metadata[condition_column].value_counts(dropna=False).to_dict()
    if group_sizes.get(control, 0) == 0 or group_sizes.get(case, 0) == 0:
        raise ValueError("Both case and control groups must contain at least one sample.")

    if min(group_sizes.get(control, 0), group_sizes.get(case, 0)) < 2:
        LOGGER.warning("Contrast has fewer than two replicates in one group. PyDESeq2 may be unstable.")

    LOGGER.info("Validated %s genes across %s selected samples", filtered_counts.shape[0], filtered_counts.shape[1])
    LOGGER.info("Group sizes: %s", group_sizes)
    return filtered_counts, filtered_metadata


def run_differential_expression(
    counts: Any,
    metadata: Any,
    condition_column: str,
    case: str,
    control: str,
    alpha: float = 0.05,
    log2fc_threshold: float = 1.0,
) -> DifferentialExpressionOutputs:
    np = _import_dependency("numpy")
    pd = _import_dependency("pandas")
    pydeseq2_dds = _import_dependency("pydeseq2.dds", "pydeseq2")
    pydeseq2_ds = _import_dependency("pydeseq2.ds", "pydeseq2")

    LOGGER.info("Running differential expression with PyDESeq2")
    dds = pydeseq2_dds.DeseqDataSet(
        counts=counts.round().astype(int),
        metadata=metadata,
        design_factors=condition_column,
        refit_cooks=True,
        n_cpus=1,
    )
    dds.deseq2()

    stats = pydeseq2_ds.DeseqStats(
        dds,
        contrast=[condition_column, case, control],
        alpha=alpha,
    )
    stats.summary()
    results = stats.results_df.copy().reset_index()
    if "index" in results.columns:
        results = results.rename(columns={"index": "gene_id"})
    elif results.columns[0] != "gene_id":
        results = results.rename(columns={results.columns[0]: "gene_id"})

    results["gene_id"] = results["gene_id"].astype(str)
    for column in ("log2FoldChange", "pvalue", "padj"):
        if column not in results.columns:
            raise ValueError(f"PyDESeq2 output missing expected column: {column}")
        results[column] = pd.to_numeric(results[column], errors="coerce")

    results = results.sort_values(by=["padj", "pvalue"], na_position="last").reset_index(drop=True)
    significance_mask = (
        results["padj"].notna()
        & (results["padj"] < alpha)
        & (results["log2FoldChange"].abs() >= log2fc_threshold)
    )
    significant = results.loc[significance_mask].copy()
    upregulated = significant.loc[significant["log2FoldChange"] >= log2fc_threshold].copy()
    downregulated = significant.loc[significant["log2FoldChange"] <= -log2fc_threshold].copy()

    ranked_scores = (
        results[["gene_id", "log2FoldChange"]]
        .dropna()
        .drop_duplicates(subset=["gene_id"], keep="first")
        .set_index("gene_id")["log2FoldChange"]
        .sort_values(ascending=False)
    )

    normalized_counts = _compute_log_cpm(counts)
    top_up = upregulated.nsmallest(10, "padj")["gene_id"].tolist()
    top_down = downregulated.nsmallest(10, "padj")["gene_id"].tolist()

    summary = {
        "n_input_genes": int(counts.shape[0]),
        "n_input_samples": int(counts.shape[1]),
        "n_tested_genes": int(results["pvalue"].notna().sum()),
        "n_significant_genes": int(significant.shape[0]),
        "n_upregulated": int(upregulated.shape[0]),
        "n_downregulated": int(downregulated.shape[0]),
        "top_upregulated_genes": top_up,
        "top_downregulated_genes": top_down,
        "alpha": alpha,
        "log2fc_threshold": log2fc_threshold,
        "min_log2fc": float(results["log2FoldChange"].min(skipna=True)) if not results.empty else math.nan,
        "max_log2fc": float(results["log2FoldChange"].max(skipna=True)) if not results.empty else math.nan,
    }

    LOGGER.info(
        "Differential expression completed: %s significant genes (%s up, %s down)",
        summary["n_significant_genes"],
        summary["n_upregulated"],
        summary["n_downregulated"],
    )
    return DifferentialExpressionOutputs(
        counts=counts,
        metadata=metadata,
        normalized_counts=normalized_counts,
        results=results,
        significant=significant,
        upregulated=upregulated,
        downregulated=downregulated,
        ranked_scores=ranked_scores,
        summary=summary,
    )


def generate_volcano_plot(
    results: Any,
    output_dir: Path,
    alpha: float = 0.05,
    log2fc_threshold: float = 1.0,
) -> Path:
    np = _import_dependency("numpy")
    matplotlib = _import_dependency("matplotlib")
    matplotlib.use("Agg")
    plt = _import_dependency("matplotlib.pyplot", "matplotlib")

    plot_frame = results.copy()
    plot_frame["minus_log10_padj"] = -np.log10(plot_frame["padj"].clip(lower=1e-300))
    plot_frame["status"] = "Not significant"
    plot_frame.loc[
        (plot_frame["padj"] < alpha) & (plot_frame["log2FoldChange"] >= log2fc_threshold),
        "status",
    ] = "Upregulated"
    plot_frame.loc[
        (plot_frame["padj"] < alpha) & (plot_frame["log2FoldChange"] <= -log2fc_threshold),
        "status",
    ] = "Downregulated"

    color_map = {
        "Not significant": "#94a3b8",
        "Upregulated": "#dc2626",
        "Downregulated": "#2563eb",
    }

    figure, axis = plt.subplots(figsize=(10, 8))
    for status, color in color_map.items():
        subset = plot_frame[plot_frame["status"] == status]
        axis.scatter(
            subset["log2FoldChange"],
            subset["minus_log10_padj"],
            s=18 if status == "Not significant" else 28,
            alpha=0.7,
            c=color,
            label=status,
            edgecolors="none",
        )

    axis.axvline(log2fc_threshold, linestyle="--", linewidth=1, color="#475569")
    axis.axvline(-log2fc_threshold, linestyle="--", linewidth=1, color="#475569")
    axis.axhline(-math.log10(alpha), linestyle="--", linewidth=1, color="#475569")
    axis.set_title("Volcano plot")
    axis.set_xlabel("log2 fold change")
    axis.set_ylabel("-log10 adjusted p-value")
    axis.legend(frameon=False)
    axis.grid(alpha=0.15)

    output_path = output_dir / "volcano_plot.png"
    figure.tight_layout()
    figure.savefig(output_path, dpi=220)
    plt.close(figure)
    LOGGER.info("Saved volcano plot to %s", output_path)
    return output_path


def generate_heatmap(
    normalized_counts: Any,
    significant_results: Any,
    metadata: Any,
    condition_column: str,
    output_dir: Path,
    top_n: int = 50,
) -> Path | None:
    if significant_results.empty:
        LOGGER.warning("Skipping heatmap because no significant genes were found.")
        return None

    np = _import_dependency("numpy")
    pd = _import_dependency("pandas")
    matplotlib = _import_dependency("matplotlib")
    matplotlib.use("Agg")
    plt = _import_dependency("matplotlib.pyplot", "matplotlib")
    sns = _import_dependency("seaborn")

    selected = (
        significant_results.sort_values(by=["padj", "pvalue"], na_position="last")
        .head(top_n)["gene_id"]
        .tolist()
    )
    heatmap_data = normalized_counts.loc[normalized_counts.index.intersection(selected)].copy()
    if heatmap_data.empty:
        LOGGER.warning("Skipping heatmap because selected genes were not present in normalized matrix.")
        return None

    heatmap_data = heatmap_data.subtract(heatmap_data.mean(axis=1), axis=0)
    heatmap_data = heatmap_data.divide(heatmap_data.std(axis=1).replace(0, np.nan), axis=0).fillna(0)
    row_labels = _infer_gene_labels(heatmap_data.index.tolist())
    heatmap_data.index = pd.Index(row_labels, name="gene_label")

    palette = {
        str(level): color
        for level, color in zip(
            metadata[condition_column].astype(str).unique().tolist(),
            ["#2563eb", "#dc2626", "#16a34a", "#d97706", "#7c3aed"],
            strict=False,
        )
    }
    column_colors = metadata[condition_column].astype(str).map(lambda value: palette.get(value, "#64748b"))

    cluster = sns.clustermap(
        heatmap_data,
        cmap="vlag",
        col_colors=column_colors,
        figsize=(12, 12),
        xticklabels=True,
        yticklabels=True,
        linewidths=0,
    )
    cluster.ax_heatmap.set_title("Heatmap of significant genes")

    output_path = output_dir / "significant_genes_heatmap.png"
    cluster.figure.savefig(output_path, dpi=220, bbox_inches="tight")
    plt.close(cluster.figure)
    LOGGER.info("Saved heatmap to %s", output_path)
    return output_path


def generate_pca(normalized_counts: Any, metadata: Any, condition_column: str, output_dir: Path) -> Path:
    pd = _import_dependency("pandas")
    matplotlib = _import_dependency("matplotlib")
    matplotlib.use("Agg")
    plt = _import_dependency("matplotlib.pyplot", "matplotlib")
    sns = _import_dependency("seaborn")
    decomposition = _import_dependency("sklearn.decomposition")

    pca = decomposition.PCA(n_components=2)
    transformed = pca.fit_transform(normalized_counts.T)
    pca_frame = pd.DataFrame(
        transformed,
        index=normalized_counts.columns,
        columns=["PC1", "PC2"],
    ).join(metadata[[condition_column]])

    figure, axis = plt.subplots(figsize=(9, 7))
    sns.scatterplot(
        data=pca_frame,
        x="PC1",
        y="PC2",
        hue=condition_column,
        s=90,
        palette="deep",
        ax=axis,
    )
    axis.set_title("PCA of samples")
    axis.set_xlabel(f"PC1 ({pca.explained_variance_ratio_[0] * 100:.1f}% variance)")
    axis.set_ylabel(f"PC2 ({pca.explained_variance_ratio_[1] * 100:.1f}% variance)")
    axis.grid(alpha=0.15)
    axis.legend(frameon=False)

    output_path = output_dir / "pca_samples.png"
    figure.tight_layout()
    figure.savefig(output_path, dpi=220)
    plt.close(figure)
    LOGGER.info("Saved PCA plot to %s", output_path)
    return output_path


def run_enrichment(
    de_outputs: DifferentialExpressionOutputs,
    output_dir: Path,
) -> dict[str, Any]:
    pd = _import_dependency("pandas")
    enrichment_results: dict[str, Any] = {}

    try:
        gseapy = _import_dependency("gseapy")
    except RuntimeError as exc:
        LOGGER.warning("Skipping enrichment because gseapy is unavailable: %s", exc)
        return enrichment_results

    ranked_gene_ids = de_outputs.ranked_scores.index.tolist()
    ranked_gene_labels = _infer_gene_labels(ranked_gene_ids)
    prerank_frame = pd.DataFrame(
        {
            "gene_name": ranked_gene_labels,
            "score": de_outputs.ranked_scores.values,
        }
    ).drop_duplicates(subset=["gene_name"], keep="first")

    gene_sets = [
        "GO_Biological_Process_2023",
        "GO_Molecular_Function_2023",
        "GO_Cellular_Component_2023",
    ]

    try:
        prerank_result = gseapy.prerank(
            rnk=prerank_frame,
            gene_sets=gene_sets,
            outdir=str(output_dir / "gseapy_prerank"),
            permutation_num=200,
            min_size=5,
            max_size=1000,
            seed=42,
            verbose=False,
        )
        enrichment_results["gsea_prerank"] = prerank_result.res2d.copy()
        LOGGER.info("Completed prerank enrichment with %s rows", enrichment_results["gsea_prerank"].shape[0])
    except Exception as exc:  # pragma: no cover - depends on remote gene sets/runtime
        LOGGER.warning("Prerank enrichment failed: %s", exc)

    for direction, frame in {
        "up": de_outputs.upregulated,
        "down": de_outputs.downregulated,
    }.items():
        if frame.empty:
            continue

        gene_names = _infer_gene_labels(frame["gene_id"].astype(str).tolist())
        if len(gene_names) < 5:
            LOGGER.warning("Skipping %s enrichment because fewer than 5 genes are available.", direction)
            continue

        try:
            enrichr_result = gseapy.enrichr(
                gene_list=gene_names,
                gene_sets=gene_sets,
                outdir=str(output_dir / f"gseapy_enrichr_{direction}"),
                cutoff=0.5,
            )
            enrichment_results[f"enrichr_{direction}"] = enrichr_result.results.copy()
            LOGGER.info(
                "Completed %s enrichr enrichment with %s rows",
                direction,
                enrichment_results[f"enrichr_{direction}"].shape[0],
            )
        except Exception as exc:  # pragma: no cover - depends on remote gene sets/runtime
            LOGGER.warning("Enrichr %s enrichment failed: %s", direction, exc)

    return enrichment_results


def export_results(
    de_outputs: DifferentialExpressionOutputs,
    enrichment_results: dict[str, Any],
    output_dir: Path,
) -> dict[str, Path]:
    pd = _import_dependency("pandas")

    output_dir.mkdir(parents=True, exist_ok=True)
    exported_paths: dict[str, Path] = {}

    differential_path = output_dir / "differential_expression_results.tsv"
    de_outputs.results.to_csv(differential_path, sep="\t", index=False)
    exported_paths["differential_expression_tsv"] = differential_path

    significant_path = output_dir / "significant_genes.tsv"
    de_outputs.significant.to_csv(significant_path, sep="\t", index=False)
    exported_paths["significant_genes_tsv"] = significant_path

    summary_path = _save_summary_json(output_dir, de_outputs.summary)
    exported_paths["summary_json"] = summary_path

    workbook_path = output_dir / "rna_seq_python_poc_results.xlsx"
    with pd.ExcelWriter(workbook_path, engine="openpyxl") as writer:
        de_outputs.results.to_excel(writer, sheet_name="DE_results", index=False)
        de_outputs.significant.to_excel(writer, sheet_name="Significant", index=False)
        de_outputs.upregulated.to_excel(writer, sheet_name="Upregulated", index=False)
        de_outputs.downregulated.to_excel(writer, sheet_name="Downregulated", index=False)
        de_outputs.metadata.reset_index().to_excel(writer, sheet_name="Metadata_used", index=False)
        for sheet_name, frame in enrichment_results.items():
            safe_name = sheet_name[:31]
            frame.to_excel(writer, sheet_name=safe_name, index=False)
    exported_paths["xlsx"] = workbook_path

    LOGGER.info("Exported tabular results to %s", output_dir)
    return exported_paths


def generate_html_report(
    output_dir: Path,
    de_outputs: DifferentialExpressionOutputs,
    generated_assets: dict[str, Path | None],
    enrichment_results: dict[str, Any],
    condition_column: str,
    case: str,
    control: str,
) -> Path:
    template_module = _import_dependency("jinja2")

    top_hits = de_outputs.significant.head(20).copy()
    top_hits_records = top_hits.fillna("").to_dict(orient="records")
    summary = de_outputs.summary
    image_paths = {
        key: path.name
        for key, path in generated_assets.items()
        if path is not None and path.exists()
    }
    enrichment_overview = {
        key: int(frame.shape[0])
        for key, frame in enrichment_results.items()
    }

    template = template_module.Template(
        """
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>RNA-seq Python PoC Report</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 2rem auto; max-width: 1100px; color: #0f172a; line-height: 1.6; }
      h1, h2 { color: #0f172a; }
      .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
      .card { border: 1px solid #cbd5e1; border-radius: 14px; padding: 1rem; background: #f8fafc; }
      .metric { font-size: 1.7rem; font-weight: 700; }
      table { width: 100%; border-collapse: collapse; margin-top: 1rem; font-size: 0.95rem; }
      th, td { border: 1px solid #e2e8f0; padding: 0.55rem; text-align: left; }
      th { background: #e2e8f0; }
      img { width: 100%; max-width: 900px; border: 1px solid #e2e8f0; border-radius: 12px; margin: 1rem 0 2rem; }
      code { background: #e2e8f0; padding: 0.15rem 0.35rem; border-radius: 6px; }
    </style>
  </head>
  <body>
    <h1>RNA-seq Python PoC Report</h1>
    <p>Contrast evaluated: <strong>{{ case }}</strong> versus <strong>{{ control }}</strong> using condition column <code>{{ condition_column }}</code>.</p>

    <div class="grid">
      <div class="card"><div>Input genes</div><div class="metric">{{ summary.n_input_genes }}</div></div>
      <div class="card"><div>Input samples</div><div class="metric">{{ summary.n_input_samples }}</div></div>
      <div class="card"><div>Significant genes</div><div class="metric">{{ summary.n_significant_genes }}</div></div>
      <div class="card"><div>Upregulated</div><div class="metric">{{ summary.n_upregulated }}</div></div>
      <div class="card"><div>Downregulated</div><div class="metric">{{ summary.n_downregulated }}</div></div>
    </div>

    <h2>Top Significant Hits</h2>
    <table>
      <thead>
        <tr>
          {% for column in ["gene_id", "log2FoldChange", "pvalue", "padj"] %}
          <th>{{ column }}</th>
          {% endfor %}
        </tr>
      </thead>
      <tbody>
        {% for row in top_hits %}
        <tr>
          <td>{{ row.get("gene_id", "") }}</td>
          <td>{{ row.get("log2FoldChange", "") }}</td>
          <td>{{ row.get("pvalue", "") }}</td>
          <td>{{ row.get("padj", "") }}</td>
        </tr>
        {% endfor %}
      </tbody>
    </table>

    <h2>Figures</h2>
    {% for label, filename in image_paths.items() %}
    <h3>{{ label.replace("_", " ").title() }}</h3>
    <img src="{{ filename }}" alt="{{ label }}" />
    {% endfor %}

    <h2>Enrichment Summary</h2>
    {% if enrichment_overview %}
    <ul>
      {% for name, row_count in enrichment_overview.items() %}
      <li><strong>{{ name }}</strong>: {{ row_count }} rows</li>
      {% endfor %}
    </ul>
    {% else %}
    <p>No enrichment output generated.</p>
    {% endif %}
  </body>
</html>
        """
    )

    html_path = output_dir / "report.html"
    html_path.write_text(
        template.render(
            case=case,
            control=control,
            condition_column=condition_column,
            summary=summary,
            top_hits=top_hits_records,
            image_paths=image_paths,
            enrichment_overview=enrichment_overview,
        ),
        encoding="utf-8",
    )
    LOGGER.info("Generated HTML report at %s", html_path)
    return html_path


def _generate_docx_report(
    output_dir: Path,
    de_outputs: DifferentialExpressionOutputs,
    generated_assets: dict[str, Path | None],
    condition_column: str,
    case: str,
    control: str,
) -> Path:
    docx_module = _import_dependency("docx", "python-docx")

    document = docx_module.Document()
    document.add_heading("RNA-seq Python PoC Report", level=1)
    document.add_paragraph(
        f"Contrast evaluated: {case} versus {control} using condition column '{condition_column}'."
    )

    summary = de_outputs.summary
    for label in [
        "n_input_genes",
        "n_input_samples",
        "n_significant_genes",
        "n_upregulated",
        "n_downregulated",
    ]:
        document.add_paragraph(f"{label}: {summary.get(label)}")

    document.add_heading("Top significant genes", level=2)
    table = document.add_table(rows=1, cols=4)
    headers = ["gene_id", "log2FoldChange", "pvalue", "padj"]
    for index, header in enumerate(headers):
        table.rows[0].cells[index].text = header

    for _, row in de_outputs.significant.head(20).iterrows():
        cells = table.add_row().cells
        for index, header in enumerate(headers):
            cells[index].text = str(row.get(header, ""))

    for label, path in generated_assets.items():
        if path is None or not path.exists():
            continue
        document.add_heading(label.replace("_", " ").title(), level=2)
        document.add_picture(str(path), width=docx_module.shared.Inches(6.5))

    output_path = output_dir / "report.docx"
    document.save(output_path)
    LOGGER.info("Generated DOCX report at %s", output_path)
    return output_path


def create_zip_package(output_dir: Path, zip_name: str = "rna_seq_python_poc_results.zip") -> Path:
    zip_path = output_dir / zip_name
    with ZipFile(zip_path, mode="w", compression=ZIP_DEFLATED) as archive:
        for path in sorted(output_dir.rglob("*")):
            if not path.is_file() or path == zip_path:
                continue
            archive.write(path, arcname=path.relative_to(output_dir))
    LOGGER.info("Created ZIP package at %s", zip_path)
    return zip_path


def _build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Python PoC for RNA-seq differential expression and enrichment.")
    parser.add_argument("--counts", required=True, help="Counts matrix file path (.csv, .tsv, .txt, .xlsx).")
    parser.add_argument("--metadata", required=True, help="Metadata file path (.csv, .tsv, .txt, .xlsx).")
    parser.add_argument("--condition-column", required=True, help="Metadata column defining contrast groups.")
    parser.add_argument("--case", required=True, help="Case group label.")
    parser.add_argument("--control", required=True, help="Control group label.")
    parser.add_argument("--output-dir", required=True, help="Directory where results will be written.")
    parser.add_argument("--alpha", type=float, default=0.05, help="Adjusted p-value threshold. Default: 0.05.")
    parser.add_argument(
        "--log2fc-threshold",
        type=float,
        default=1.0,
        help="Absolute log2 fold change threshold for significance. Default: 1.0.",
    )
    parser.add_argument(
        "--top-heatmap-genes",
        type=int,
        default=50,
        help="Maximum number of significant genes to draw in heatmap. Default: 50.",
    )
    parser.add_argument(
        "--docx",
        action="store_true",
        help="Also generate DOCX report using python-docx.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable debug logging.",
    )
    return parser


def main() -> int:
    parser = _build_arg_parser()
    args = parser.parse_args()
    _configure_logging(verbose=args.verbose)

    output_dir = Path(args.output_dir).expanduser().resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    try:
        loaded = load_inputs(args.counts, args.metadata)
        counts, metadata = validate_inputs(
            loaded.counts,
            loaded.metadata,
            args.condition_column,
            args.case,
            args.control,
            loaded.sample_column,
        )
        de_outputs = run_differential_expression(
            counts,
            metadata,
            args.condition_column,
            args.case,
            args.control,
            alpha=args.alpha,
            log2fc_threshold=args.log2fc_threshold,
        )

        generated_assets: dict[str, Path | None] = {}
        generated_assets["volcano_plot"] = generate_volcano_plot(
            de_outputs.results,
            output_dir,
            alpha=args.alpha,
            log2fc_threshold=args.log2fc_threshold,
        )
        generated_assets["heatmap"] = generate_heatmap(
            de_outputs.normalized_counts,
            de_outputs.significant,
            de_outputs.metadata,
            args.condition_column,
            output_dir,
            top_n=args.top_heatmap_genes,
        )
        generated_assets["pca"] = generate_pca(
            de_outputs.normalized_counts,
            de_outputs.metadata,
            args.condition_column,
            output_dir,
        )

        enrichment_results = run_enrichment(de_outputs, output_dir)
        exported_paths = export_results(de_outputs, enrichment_results, output_dir)
        html_report = generate_html_report(
            output_dir,
            de_outputs,
            generated_assets,
            enrichment_results,
            args.condition_column,
            args.case,
            args.control,
        )
        exported_paths["html_report"] = html_report

        if args.docx:
            exported_paths["docx_report"] = _generate_docx_report(
                output_dir,
                de_outputs,
                generated_assets,
                args.condition_column,
                args.case,
                args.control,
            )

        de_outputs.summary["generated_files"] = {
            key: str(path.relative_to(output_dir))
            for key, path in exported_paths.items()
            if path.exists()
        }
        _save_summary_json(output_dir, de_outputs.summary)
        exported_paths["zip_package"] = create_zip_package(output_dir)
        LOGGER.info("Pipeline finished successfully.")
        return 0
    except Exception as exc:
        LOGGER.exception("Pipeline failed: %s", exc)
        return 1


if __name__ == "__main__":
    sys.exit(main())
