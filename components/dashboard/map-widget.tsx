'use client';

export function MapWidget() {
  return (
    <div className="bg-card rounded-xl p-4 border border-border">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">Live Locations</h3>
      
      <div className="relative h-32 sm:h-48 bg-gradient-to-br from-blue-100 to-green-100 dark:from-blue-900 dark:to-green-900 rounded-lg overflow-hidden">
        {/* Simple map representation */}
        <div className="absolute inset-0">
          {/* Roads */}
          <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-400 transform -translate-y-1/2" />
          <div className="absolute top-0 left-1/2 w-1 h-full bg-gray-400 transform -translate-x-1/2" />
          
          {/* Car icon */}
          <div className="absolute top-1/2 left-1/2 w-3 h-3 sm:w-4 sm:h-4 bg-primary rounded transform -translate-x-1/2 -translate-y-1/2">
            <div className="absolute -top-1 -left-1 w-4 h-4 sm:w-6 sm:h-6 bg-primary/20 rounded-full" />
          </div>
          
          {/* Speed indicator */}
          <div className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-card/80 backdrop-blur-sm rounded px-2 py-1">
            <span className="text-xs font-medium text-foreground">42 km/h</span>
          </div>
        </div>
        
        {/* Route info */}
        <div className="absolute bottom-2 left-2 right-2 sm:bottom-4 sm:left-4 sm:right-4 bg-card/80 backdrop-blur-sm rounded-lg p-2 sm:p-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">10:37h</span>
            <span className="text-foreground font-medium">41 Km</span>
            <span className="text-muted-foreground">Chegada</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            23km Avenida Brasil
          </div>
        </div>
      </div>
    </div>
  );
}
