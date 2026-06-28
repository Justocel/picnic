'use client';

import VideoItem from './VideoItem';
import { secciones } from '../data/data';
import { useVideos } from '../context/VideosProvider';
import { useEditMode } from '../context/EditModeProvider';
import EditableText from './EditableText';

/**
 * COMPONENTE PICNIC EN LA ESCENA
 * "Gracias por la intercomunicación" y "Picnic en la tierra" como sub-secciones.
 *
 * En edit mode, los editores ven una tercera sub-sección "Sin clasificar"
 * con los videos que el cron metió sin asignar seccion. Cada video tiene
 * controles inline: dropdown de seccion, toggle visible, reorder, borrar.
 */
function PicnicEscena() {
  const {
    videos,
    videosBySeccion,
    hydrated,
    setSeccion,
    toggleVisible,
    deleteVideo,
    moveUp,
    moveDown,
  } = useVideos();
  const { editMode } = useEditMode();

  const sinClasificar = videos.filter((v) => v.seccion === null);
  const graciasVisibles = videosBySeccion('gracias').filter((v) => v.visible);
  const picnicVisibles = videosBySeccion('picnic').filter((v) => v.visible);

  // En modo público: si las dos sub-secciones no tienen videos visibles,
  // la sección entera no aparece. En edit mode siempre se muestra.
  if (
    !editMode &&
    hydrated &&
    graciasVisibles.length === 0 &&
    picnicVisibles.length === 0
  ) {
    return null;
  }

  const handleDelete = async (v) => {
    if (
      !confirm(
        `¿Borrar "${v.titulo}"? El cron lo volvería a meter si sigue en el canal.`
      )
    )
      return;
    const { error } = await deleteVideo(v.id);
    if (error) alert('Error al borrar: ' + error.message);
  };

  const renderControls = (v, listInSection) => {
    const idx = listInSection.findIndex((x) => x.id === v.id);
    return (
      <div className="edit-controls">
        <select
          value={v.seccion ?? ''}
          onChange={(e) => setSeccion(v.id, e.target.value || null)}
          title="Sección"
          className="edit-seccion-select"
        >
          <option value="">Sin clasificar</option>
          <option value="gracias">Gracias</option>
          <option value="picnic">Picnic</option>
        </select>
        <button
          type="button"
          onClick={() => moveUp(v.id)}
          disabled={idx <= 0}
          title="Subir"
        >
          ↑
        </button>
        <button
          type="button"
          onClick={() => moveDown(v.id)}
          disabled={idx === listInSection.length - 1}
          title="Bajar"
        >
          ↓
        </button>
        <button type="button" onClick={() => toggleVisible(v.id)}>
          {v.visible ? 'Ocultar' : 'Mostrar'}
        </button>
        <button
          type="button"
          onClick={() => handleDelete(v)}
          className="edit-delete"
        >
          Borrar
        </button>
      </div>
    );
  };

  const renderSubseccion = (sub, lista) => (
    <div key={sub.id} id={sub.id} className="subseccion">
      <div className="subseccion-header">
        <h3>{sub.titulo}</h3>
      </div>
      <div className="videos-grid">
        {hydrated && lista.length === 0 ? (
          <p className="seccion-placeholder-vacio">
            Todavía no documentamos esta parte de la escena.
          </p>
        ) : (
          lista.map((video) => (
            <div
              key={video.id}
              className={`video-wrapper${
                !video.visible ? ' video-wrapper--hidden' : ''
              }`}
            >
              <VideoItem
                videoData={{
                  id: video.id,
                  titulo: video.titulo,
                  link: video.youtube_id,
                }}
              />
              {editMode && renderControls(video, lista)}
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <section
      id={secciones.picnicEscena.id}
      className={`seccion-placeholder${editMode ? ' seccion--edit' : ''}`}
    >
      <div className="seccion-header">
        <EditableText
          settingKey="seccion_picnic_escena_titulo"
          fallback={secciones.picnicEscena.titulo}
          as="h2"
          maxLength={80}
        />
        {editMode && (
          <p className="seccion-descripcion">
            Los videos los sincroniza el cron desde YouTube. Asigná sección
            para que se muestren al público.
          </p>
        )}
      </div>

      {(editMode || graciasVisibles.length > 0) &&
        renderSubseccion(secciones.gracias, videosBySeccion('gracias'))}
      {(editMode || picnicVisibles.length > 0) &&
        renderSubseccion(secciones.picnic, videosBySeccion('picnic'))}

      {editMode && sinClasificar.length > 0 && (
        <div className="subseccion subseccion--editor-only">
          <div className="subseccion-header">
            <h3>Sin clasificar ({sinClasificar.length})</h3>
            <p className="seccion-descripcion">
              Solo visible para editores. Asigná una sección para publicarlos.
            </p>
          </div>
          <div className="videos-grid">
            {sinClasificar.map((video) => (
              <div key={video.id} className="video-wrapper">
                <VideoItem
                  videoData={{
                    id: video.id,
                    titulo: video.titulo,
                    link: video.youtube_id,
                  }}
                />
                {renderControls(video, sinClasificar)}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default PicnicEscena;
