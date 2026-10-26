import { useEffect, useId, useMemo, useState } from "react";

// Fonte única de municípios para todos os formulários do sistema.
const IBGE_URL = "https://servicodados.ibge.gov.br/api/v1/localidades/municipios";
let cityCache = null;
let cityRequest = null;
function loadCities() {
  if (cityCache) return Promise.resolve(cityCache);
  if (!cityRequest) cityRequest = fetch(IBGE_URL)
    .then((response) => { if (!response.ok) throw new Error("IBGE indisponível"); return response.json(); })
    .then((items) => {
      if (!Array.isArray(items)) throw new Error("Resposta inválida");
      cityCache = items.map((item) => {
        const uf = item.microrregiao?.mesorregiao?.UF?.sigla ?? item["regiao-imediata"]?.["regiao-intermediaria"]?.UF?.sigla;
        return uf ? `${item.nome} - ${uf}` : null;
      }).filter(Boolean).sort((a, b) => a.localeCompare(b, "pt-BR"));
      return cityCache;
    }).catch((error) => { cityRequest = null; throw error; });
  return cityRequest;
}
const normalizeCity = (text) => String(text ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
export default function MunicipalityField({ label, value, onChange, required = false, placeholder }) {
  const [cities, setCities] = useState(cityCache ?? []);
  const [loading, setLoading] = useState(!cityCache);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    loadCities().then((items) => { if (active) { setCities(items); setLoading(false); } })
      .catch(() => { if (active) { setFailed(true); setLoading(false); } });
    return () => { active = false; };
  }, []);
  const listId = useId();
  const suggestions = useMemo(() => {
    const search = normalizeCity(value).trim();
    if (search.length < 2) return [];
    return cities.filter((city) => normalizeCity(city).includes(search)).slice(0, 35);
  }, [cities, value]);
  return <label className={`editor-field ${required && !String(value ?? "").trim() ? "freight-required-empty" : ""}`}>
    <span>{label}</span>
    <input type="text" value={value ?? ""} onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder} required={required} list={listId} autoComplete="off" />
    <datalist id={listId}>{suggestions.map((city) => <option key={city} value={city} />)}</datalist>
    {failed && <small>Lista do IBGE indisponível. Digite manualmente.</small>}
    {loading && <small>Carregando municípios do IBGE…</small>}
  </label>;
}

