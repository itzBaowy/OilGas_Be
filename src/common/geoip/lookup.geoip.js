import geoip from 'geoip-lite';

export const getLocation = (clientIp) => {
    const geo = geoip.lookup(clientIp);
    const location = geo ? `${geo.city}, ${geo.country}` : 'Unknown Location';
    return location;
}
