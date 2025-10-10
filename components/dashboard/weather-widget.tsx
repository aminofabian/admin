'use client';

interface WeatherData {
  temperature: number;
  condition: string;
  windSpeed: number;
  humidity: number;
}

export function WeatherWidget() {
  const weather: WeatherData = {
    temperature: 27,
    condition: 'Sunny Cloudy',
    windSpeed: 16,
    humidity: 83,
  };

  return (
    <div className="bg-card rounded-xl p-4 border border-border">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">Weather</h3>
      
      <div className="text-center mb-4">
        <div className="text-3xl font-bold text-foreground mb-1">
          {weather.temperature}°C
        </div>
        <div className="text-sm text-muted-foreground mb-2">
          {weather.condition}
        </div>
        <div className="text-xs text-muted-foreground">
          {weather.windSpeed} km/h
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Humidity</span>
          <span className="text-foreground">{weather.humidity}%</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Wind</span>
          <span className="text-foreground">{weather.windSpeed} km/h</span>
        </div>
      </div>

      <div className="mt-4 flex justify-center">
        <div className="flex space-x-1">
          {Array.from({ length: 10 }, (_, i) => (
            <div
              key={i}
              className={`w-1 h-2 rounded ${
                i < 2 ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground ml-2">2 of 10</span>
      </div>
    </div>
  );
}
