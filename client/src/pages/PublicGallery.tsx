import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useSearch } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Image as ImageIcon, 
  ZoomIn, 
  ChevronLeft, 
  ChevronRight,
  X,
  Download,
  Palette,
  Box
} from "lucide-react";

const WORK_TYPES: Record<string, string> = {
  cocina: "Cocina Integral",
  closet: "Closet",
  puertas: "Puertas",
  centro_tv: "Centro de TV",
};

export default function PublicGallery() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const projectId = parseInt(params.get("project") || "0");
  const photoType = params.get("type") as "modelado" | "renders" | undefined;

  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<string>(photoType || "all");

  const { data, isLoading, error } = trpc.publicGallery.getProjectPhotos.useQuery(
    { projectId, type: photoType },
    { enabled: projectId > 0 }
  );

  if (projectId === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <ImageIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h1 className="text-xl font-semibold text-gray-700 mb-2">Enlace inválido</h1>
          <p className="text-gray-500">El enlace que recibiste no es válido. Por favor contacta a INNOVAR Cocinas.</p>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando galería...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <ImageIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h1 className="text-xl font-semibold text-gray-700 mb-2">Proyecto no encontrado</h1>
          <p className="text-gray-500">No pudimos encontrar el proyecto solicitado.</p>
        </Card>
      </div>
    );
  }

  const { project, client, photos, totalModelado, totalRenders } = data;

  // Filtrar fotos según la pestaña activa
  const filteredPhotos = activeTab === "all" 
    ? photos 
    : photos.filter(p => p.subcategory === activeTab);

  // Navegación del visor
  const currentPhotoIndex = selectedPhoto !== null 
    ? filteredPhotos.findIndex(p => p.id === selectedPhoto) 
    : -1;

  const goToPrevious = () => {
    if (currentPhotoIndex > 0) {
      setSelectedPhoto(filteredPhotos[currentPhotoIndex - 1].id);
    }
  };

  const goToNext = () => {
    if (currentPhotoIndex < filteredPhotos.length - 1) {
      setSelectedPhoto(filteredPhotos[currentPhotoIndex + 1].id);
    }
  };

  const selectedPhotoData = selectedPhoto !== null 
    ? filteredPhotos.find(p => p.id === selectedPhoto) 
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header con logo */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-center">
            <img 
              src="/logo-light.png" 
              alt="INNOVAR Cocinas Integrales" 
              className="h-14 md:h-16 object-contain"
            />
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Info del proyecto */}
        <div className="text-center mb-8">
          <Badge className="mb-3 bg-teal-100 text-teal-700 hover:bg-teal-100">
            {WORK_TYPES[project.workType] || project.workType}
          </Badge>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
            {project.name}
          </h1>
          {client && (
            <p className="text-gray-600">
              Diseño exclusivo para <span className="font-medium">{client.name}</span>
            </p>
          )}
        </div>

        {/* Pestañas de filtro */}
        {!photoType && (totalModelado > 0 || totalRenders > 0) && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-3">
              <TabsTrigger value="all" className="flex items-center gap-1">
                <ImageIcon className="h-4 w-4" />
                Todas ({photos.length})
              </TabsTrigger>
              <TabsTrigger value="modelado" className="flex items-center gap-1" disabled={totalModelado === 0}>
                <Box className="h-4 w-4" />
                Modelado ({totalModelado})
              </TabsTrigger>
              <TabsTrigger value="renders" className="flex items-center gap-1" disabled={totalRenders === 0}>
                <Palette className="h-4 w-4" />
                Renders ({totalRenders})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {/* Galería de fotos */}
        {filteredPhotos.length === 0 ? (
          <Card className="text-center p-12">
            <ImageIcon className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No hay imágenes disponibles en esta categoría</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPhotos.map((photo, index) => (
              <Card 
                key={photo.id} 
                className="overflow-hidden cursor-pointer group hover:shadow-lg transition-shadow"
                onClick={() => setSelectedPhoto(photo.id)}
              >
                <div className="relative aspect-[4/3] bg-gray-100">
                  <img
                    src={photo.photoUrl}
                    alt={photo.description || `Imagen ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <Badge 
                    className={`absolute top-2 left-2 ${
                      photo.subcategory === "modelado" 
                        ? "bg-purple-500 hover:bg-purple-500" 
                        : "bg-green-500 hover:bg-green-500"
                    }`}
                  >
                    {photo.subcategory === "modelado" ? "Modelado 3D" : "Render"}
                  </Badge>
                </div>
                {photo.description && (
                  <CardContent className="p-3">
                    <p className="text-sm text-gray-600 line-clamp-2">{photo.description}</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Mensaje de contacto */}
        <div className="mt-12 text-center">
          <Card className="inline-block p-6 bg-gradient-to-r from-teal-50 to-emerald-50 border-teal-200">
            <p className="text-gray-700 mb-2">
              ¿Tienes alguna pregunta o necesitas cambios?
            </p>
            <p className="text-teal-700 font-medium">
              Contáctanos por WhatsApp: <a href="https://wa.me/573136802025" className="underline">313 680 2025</a>
            </p>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-6 mt-12">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-gray-400 text-sm">
            © {new Date().getFullYear()} INNOVAR Cocinas Integrales
          </p>
          <p className="text-gray-500 text-xs mt-1">
            K9 vía Cerritos a Pereira · Tel: 313 680 2025
          </p>
        </div>
      </footer>

      {/* Visor de imagen a pantalla completa */}
      {selectedPhotoData && (
        <div 
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center"
          onClick={() => setSelectedPhoto(null)}
        >
          {/* Botón cerrar */}
          <button 
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2 z-10"
            onClick={() => setSelectedPhoto(null)}
          >
            <X className="h-8 w-8" />
          </button>

          {/* Navegación anterior */}
          {currentPhotoIndex > 0 && (
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-2 bg-black/50 rounded-full z-10"
              onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
          )}

          {/* Imagen */}
          <div className="max-w-[90vw] max-h-[85vh] relative" onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedPhotoData.photoUrl}
              alt={selectedPhotoData.description || "Imagen del proyecto"}
              className="max-w-full max-h-[85vh] object-contain"
            />
            
            {/* Info de la imagen */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Badge 
                    className={`mb-2 ${
                      selectedPhotoData.subcategory === "modelado" 
                        ? "bg-purple-500" 
                        : "bg-green-500"
                    }`}
                  >
                    {selectedPhotoData.subcategory === "modelado" ? "Modelado 3D" : "Render Final"}
                  </Badge>
                  {selectedPhotoData.description && (
                    <p className="text-white/90 text-sm">{selectedPhotoData.description}</p>
                  )}
                  <p className="text-white/60 text-xs mt-1">
                    {currentPhotoIndex + 1} de {filteredPhotos.length}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-white border-white/50 hover:bg-white/20"
                  onClick={() => window.open(selectedPhotoData.photoUrl, "_blank")}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Descargar
                </Button>
              </div>
            </div>
          </div>

          {/* Navegación siguiente */}
          {currentPhotoIndex < filteredPhotos.length - 1 && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-2 bg-black/50 rounded-full z-10"
              onClick={(e) => { e.stopPropagation(); goToNext(); }}
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
