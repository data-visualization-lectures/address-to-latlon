"use client"

import { useState, useEffect } from "react"
import Papa from "papaparse"

declare global {
  function getLatLng(
    address: string,
    callback: (result: { lat: number; lng: number; level: number; pref: string; city: string; town: string; addr: string }) => void,
    errorCallback?: (error: Error) => void
  ): void
}

interface GeocodedRow {
  [key: string]: string | number | undefined
  latitude?: number
  longitude?: number
  geocoding_status?: string
  error_message?: string
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [data, setData] = useState<GeocodedRow[]>([])
  const [addressColumns, setAddressColumns] = useState<string[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string>("")
  const [success, setSuccess] = useState(false)
  const [geocoderReady, setGeocoderReady] = useState(false)
  const [inputEncoding, setInputEncoding] = useState<string>("UTF-8")
  const [coordinateFormat, setCoordinateFormat] = useState<"separate" | "combined">("separate")

  // Load Community Geocoder script
  useEffect(() => {
    const script = document.createElement("script")
    script.src = "https://cdn.geolonia.com/community-geocoder.js"
    script.async = true
    script.onload = () => {
      setGeocoderReady(true)
    }
    script.onerror = () => {
      setError("Failed to load geocoding service")
    }
    document.body.appendChild(script)

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setError("")
    setSuccess(false)
    setData([])
    setProgress(0)

    // Read file with specified encoding
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer
        const decoder = new TextDecoder(inputEncoding)
        const text = decoder.decode(arrayBuffer)

        // Parse CSV to detect columns
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.data.length > 0) {
              const cols = Object.keys(results.data[0] as Record<string, unknown>)
              setColumns(cols)
              if (addressColumns.length === 0 && cols.length > 0) {
                setAddressColumns([cols[0]])
              }
            }
          },
          error: (error: { message: string }) => {
            setError(`CSVの読み込みエラー: ${error.message}`)
          },
        })
      } catch (err) {
        setError(`ファイル読み込みエラー: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
    reader.onerror = () => {
      setError("ファイルの読み込みに失敗しました")
    }
    reader.readAsArrayBuffer(selectedFile)
  }

  const geocodeAddress = (address: string): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (typeof window !== "undefined" && typeof getLatLng !== "undefined") {
        getLatLng(
          address,
          (result) => {
            resolve({
              lat: result.lat,
              lng: result.lng,
            })
          },
          () => {
            resolve(null)
          }
        )
      } else {
        resolve(null)
      }
    })
  }

  const handleProcess = async () => {
    if (!file || addressColumns.length === 0) {
      setError("ファイルと住所列を選択してください")
      return
    }

    if (!geocoderReady) {
      setError("ジオコーディングサービスがロード中です。お待ちください...")
      return
    }

    setLoading(true)
    setProgress(0)
    setError("")

    // Read file with specified encoding
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer
        const decoder = new TextDecoder(inputEncoding)
        const text = decoder.decode(arrayBuffer)

        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: async (results) => {
            try {
              const rows: GeocodedRow[] = results.data as GeocodedRow[]
              const geocodedRows: GeocodedRow[] = []

              for (let i = 0; i < rows.length; i++) {
                const row = rows[i]

                // 複数列の値を結合して住所を作成
                const addressParts = addressColumns
                  .map((col) => {
                    const value = row[col]
                    return value ? String(value).trim() : ""
                  })
                  .filter((part) => part.length > 0)

                const address = addressParts.join("")

                if (address) {
                  const coords = await geocodeAddress(address)
                  if (coords) {
                    geocodedRows.push({
                      ...row,
                      latitude: coords.lat,
                      longitude: coords.lng,
                      geocoding_status: "成功",
                    })
                  } else {
                    geocodedRows.push({
                      ...row,
                      geocoding_status: "失敗",
                      error_message: "結果が見つかりません",
                    })
                  }
                } else {
                  geocodedRows.push({
                    ...row,
                    geocoding_status: "スキップ",
                    error_message: "住所が空です",
                  })
                }

                setProgress(Math.round(((i + 1) / rows.length) * 100))
              }

              setData(geocodedRows)
              setSuccess(true)
            } catch (err) {
              setError(`処理エラー: ${err instanceof Error ? err.message : String(err)}`)
            } finally {
              setLoading(false)
            }
          },
          error: (error: { message: string }) => {
            setError(`CSVの読み込みエラー: ${error.message}`)
            setLoading(false)
          },
        })
      } catch (err) {
        setError(`ファイル読み込みエラー: ${err instanceof Error ? err.message : String(err)}`)
        setLoading(false)
      }
    }
    reader.onerror = () => {
      setError("ファイルの読み込みに失敗しました")
      setLoading(false)
    }
    reader.readAsArrayBuffer(file)
  }

  const buildExportRows = () => {
    if (coordinateFormat === "combined") {
      return data.map((row) => {
        const { latitude, longitude, ...rest } = row
        return {
          ...rest,
          lat_lon:
            typeof latitude === "number" && typeof longitude === "number" ? `${latitude},${longitude}` : "",
        }
      })
    }
    return data
  }

  const handleDownload = () => {
    if (data.length === 0) {
      setError("ダウンロードするデータがありません")
      return
    }

    const csv = Papa.unparse(buildExportRows())
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)

    // Generate filename from original file name
    const originalFileName = file?.name || "data.csv"
    const fileNameWithoutExt = originalFileName.replace(/\.csv$/i, "")
    const downloadFileName = `${fileNameWithoutExt}_geocoded.csv`

    link.setAttribute("href", url)
    link.setAttribute("download", downloadFileName)
    link.style.visibility = "hidden"

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">住所 → 緯度経度 変換ツール</h1>
          <p className="text-gray-600">CSVファイルの住所データを緯度・経度に変換できます</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          {/* Error Alert */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">
              {error}
            </div>
          )}

          {/* Success Alert */}
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded text-green-700">
              ✓ ジオコーディング完了！{data.length}件の住所を処理しました。
            </div>
          )}

          {/* File Upload Section */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CSVファイルをアップロード
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="file-input"
              />
              <label htmlFor="file-input" className="cursor-pointer">
                <p className="text-gray-600">
                  {file ? `📄 ${file.name}` : "クリックするか、ファイルをドラッグ＆ドロップ"}
                </p>
                <p className="text-sm text-gray-500 mt-1">CSVファイルのみ対応</p>
              </label>
            </div>
          </div>

          {/* Input Encoding Selection */}
          {file && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                入力ファイルの文字コード
              </label>
              <select
                value={inputEncoding}
                onChange={(e) => {
                  setInputEncoding(e.target.value)
                  // Re-read file with new encoding
                  const reader = new FileReader()
                  reader.onload = (event) => {
                    try {
                      const arrayBuffer = event.target?.result as ArrayBuffer
                      const decoder = new TextDecoder(e.target.value)
                      const text = decoder.decode(arrayBuffer)

                      Papa.parse(text, {
                        header: true,
                        skipEmptyLines: true,
                        complete: (results) => {
                          if (results.data.length > 0) {
                            const cols = Object.keys(results.data[0] as Record<string, unknown>)
                            setColumns(cols)
                            setAddressColumns([cols[0] || ""])
                          }
                        },
                        error: (error: { message: string }) => {
                          setError(`CSVの読み込みエラー: ${error.message}`)
                        },
                      })
                    } catch (err) {
                      setError(`ファイル読み込みエラー: ${err instanceof Error ? err.message : String(err)}`)
                    }
                  }
                  reader.readAsArrayBuffer(file)
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="UTF-8">UTF-8</option>
                <option value="Shift_JIS">Shift_JIS (シフトJIS)</option>
              </select>
            </div>
          )}

          {/* Column Selection */}
          {columns.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                住所が含まれている列を選択（複数選択可能）
              </label>
              <div className="space-y-2 p-3 border border-gray-300 rounded-lg bg-gray-50">
                {columns.map((col) => (
                  <label key={col} className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addressColumns.includes(col)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setAddressColumns([...addressColumns, col])
                        } else {
                          setAddressColumns(addressColumns.filter((c) => c !== col))
                        }
                      }}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{col}</span>
                  </label>
                ))}
              </div>
              {addressColumns.length > 0 && (
                <p className="text-xs text-gray-600 mt-2">
                  選択中: {addressColumns.join(" + ")}
                </p>
              )}
            </div>
          )}

          {/* Process Button */}
          <div className="mb-6">
            <button
              onClick={handleProcess}
              disabled={!file || addressColumns.length === 0 || loading || !geocoderReady}
              className={`w-full py-3 px-4 rounded-lg font-medium text-white transition ${
                loading || !file || addressColumns.length === 0 || !geocoderReady
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {!geocoderReady
                ? "ジオコーディングサービスをロード中..."
                : loading
                  ? `処理中... (${progress}%)`
                  : "変換実行"}
            </button>
          </div>

          {/* Progress Bar */}
          {loading && (
            <div className="mb-6">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Results Preview */}
          {data.length > 0 && !loading && (
            <div className="mb-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-3">
                <h3 className="text-lg font-medium text-gray-900">変換結果プレビュー</h3>
                <div className="flex flex-wrap gap-4 text-sm text-gray-700">
                  <span className="font-medium">緯度経度の格納形式:</span>
                  <label className="inline-flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="coordinate-format"
                      value="separate"
                      checked={coordinateFormat === "separate"}
                      onChange={() => setCoordinateFormat("separate")}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    2列（緯度 / 経度）
                  </label>
                  <label className="inline-flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="coordinate-format"
                      value="combined"
                      checked={coordinateFormat === "combined"}
                      onChange={() => setCoordinateFormat("combined")}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    1列（緯度, 経度）
                  </label>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      {(coordinateFormat === "separate"
                        ? ["住所", "緯度", "経度", "ステータス"]
                        : ["住所", "緯度・経度", "ステータス"]
                      ).map((col) => (
                        <th key={col} className="border border-gray-300 px-3 py-2 text-left text-sm font-medium text-gray-700">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.slice(0, 5).map((row, idx) => {
                      // 選択列の値を結合して表示
                      const displayAddress = addressColumns
                        .map((col) => row[col])
                        .filter((val) => val)
                        .join("")
                      return (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-3 py-2 text-sm">{displayAddress}</td>
                          {coordinateFormat === "separate" ? (
                            <>
                              <td className="border border-gray-300 px-3 py-2 text-sm">
                                {typeof row.latitude === "number" ? row.latitude.toFixed(6) : "-"}
                              </td>
                              <td className="border border-gray-300 px-3 py-2 text-sm">
                                {typeof row.longitude === "number" ? row.longitude.toFixed(6) : "-"}
                              </td>
                            </>
                          ) : (
                            <td className="border border-gray-300 px-3 py-2 text-sm">
                              {typeof row.latitude === "number" && typeof row.longitude === "number"
                                ? `${row.latitude.toFixed(6)}, ${row.longitude.toFixed(6)}`
                                : "-"}
                            </td>
                          )}
                          <td className="border border-gray-300 px-3 py-2 text-sm">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                row.geocoding_status === "成功"
                                  ? "bg-green-100 text-green-800"
                                  : row.geocoding_status === "失敗"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {row.geocoding_status}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {data.length > 5 && (
                <p className="text-sm text-gray-600 mt-2">
                  ... ほか {data.length - 5} 件
                </p>
              )}
            </div>
          )}

          {/* Download Button */}
          {data.length > 0 && !loading && (
            <button
              onClick={handleDownload}
              className="w-full py-3 px-4 rounded-lg font-medium text-white bg-green-600 hover:bg-green-700 transition"
            >
              ⬇️ CSVをダウンロード
            </button>
          )}
        </div>

        {/* Info Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">ℹ️ 使用方法と特徴</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Geoloniaのコミュニティジオコーダー（国土交通省の位置参照情報を使用）を採用</li>
            <li>• 日本の住所に特化した高精度な変換が可能</li>
            <li>• すべてのデータはブラウザ上で処理 - サーバーにアップロードされません</li>
            <li>• 出力CSVに自動的に緯度・経度列が追加されます</li>
            <li>• 地図作成やロケーションベースの分析に最適です</li>
            <li>• 入力ファイルの文字コード（UTF-8 / Shift_JIS）を選択可能</li>
            <li>• 出力ファイルはUTF-8でダウンロード</li>
          </ul>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-slate-950/80 py-10 text-center text-sm text-white/50 mt-12">
        <p>
          © <a href="https://visualizing.jp/" target="_blank" className="hover:text-white/70 transition">Visualizing.JP</a> | <a href="https://www.dataviz.jp/" target="_blank" className="hover:text-white/70 transition">Dataviz.JP</a>
        </p>
      </footer>
    </div>
  )
}
