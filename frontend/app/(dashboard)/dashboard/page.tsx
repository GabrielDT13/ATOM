export default function DashboardPage() {
  return (
    <div className="content-home" id="home-section">
      <div className="content-card">
        <h2 className="home-title">Plataforma para el análisis de datos ómicos</h2>
        <p>
          En esta plataforma de análisis avanzados de datos ómicos, los usuarios
          pueden cargar sus datos experimentales obteniendo informes de
          resultados que interpretan los procesos biológicos subyacentes.
        </p>
      </div>
      <div className="image-row">
        <div className="cell">
          <img alt="ChIP-seq" src="/images/ChIP-seq_icon.png" />
        </div>
        <div className="cell">
          <img alt="RNA-seq" src="/images/RNA-seq_icon.png" />
        </div>
        <div className="cell">
          <img alt="ATAC-seq" src="/images/ATAC-seq_icon.png" />
        </div>
        <div className="cell">
          <img alt="scRNA-seq" src="/images/scRNA-seq_icon.png" />
        </div>
      </div>
      <div className="content-card">
        <p>
          En esta plataforma de análisis avanzados de datos ómicos, los usuarios
          pueden cargar sus datos experimentales obteniendo informes de
          resultados que interpretan los procesos biológicos subyacentes.
        </p>
      </div>
    </div>
  );
}
