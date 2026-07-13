
"use client"

import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icon in Leaflet with Next.js/React
// See: https://github.com/PaulLeCam/react-leaflet/issues/453
const icon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});


function LocationMarker({ position, setPosition, onChange }: { position: { lat: number, lng: number } | null, setPosition: (pos: { lat: number, lng: number }) => void, onChange: (lat: number, lng: number) => void }) {
    const map = useMapEvents({
        click(e) {
            setPosition(e.latlng)
            onChange(e.latlng.lat, e.latlng.lng)
            map.flyTo(e.latlng, map.getZoom())
        },
    })

    return position === null ? null : (
        <Marker position={position} icon={icon}></Marker>
    )
}

interface MapPickerProps {
    lat?: number
    lng?: number
    onChange: (lat: number, lng: number) => void
}

export default function MapPicker({ lat, lng, onChange }: MapPickerProps) {
    const [position, setPosition] = useState<{ lat: number, lng: number } | null>(
        lat && lng ? { lat, lng } : null
    )

    // Sync props to state if they change externally (e.g. from geocoding)
    useEffect(() => {
        if (lat && lng) {
            setPosition({ lat, lng })
        }
    }, [lat, lng])

    // Default center: Lima, Peru
    const defaultCenter = { lat: -12.0464, lng: -77.0428 }
    const center = position || defaultCenter

    function MapUpdater({ center }: { center: { lat: number, lng: number } }) {
        const map = useMapEvents({})
        useEffect(() => {
            map.setView(center, map.getZoom())
        }, [center, map])
        return null
    }

    return (
        <div className="h-[300px] w-full">
            <MapContainer 
                center={center} 
                zoom={13} 
                scrollWheelZoom={true} 
                className="h-full w-full rounded-lg"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <LocationMarker position={position} setPosition={setPosition} onChange={onChange} />
                <MapUpdater center={center} />
            </MapContainer>
        </div>
    )
}
